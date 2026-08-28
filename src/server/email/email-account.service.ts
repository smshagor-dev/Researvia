import { createHash, randomBytes } from "node:crypto";
import { getServerEnv } from "@/config/env";
import { connectDatabase } from "@/server/db/mongoose";
import { assertOutboundMailAllowed } from "@/server/email/deliverability.service";
import { AppError } from "@/server/errors/AppError";
import { EmailAccount } from "@/server/models/EmailAccount";
import { EmailMessage } from "@/server/models/EmailMessage";
import { OAuthState } from "@/server/models/OAuthState";
import { decryptSecret, encryptSecret } from "@/server/security/crypto-box";

export type EmailProvider = "GOOGLE" | "MICROSOFT";
const stateHash = (value: string) => createHash("sha256").update(value).digest("hex");
const base64url = (value: Buffer) => value.toString("base64url");

function providerConfig(provider: EmailProvider) {
  const env = getServerEnv();
  if (provider === "GOOGLE") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new AppError("GOOGLE_EMAIL_NOT_CONFIGURED", 503, "Google email connection is not configured.");
    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"]
    };
  }
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) throw new AppError("MICROSOFT_EMAIL_NOT_CONFIGURED", 503, "Microsoft email connection is not configured.");
  return {
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["openid", "email", "profile", "offline_access", "User.Read", "Mail.Read", "Mail.Send"]
  };
}

function redirectUri(provider: EmailProvider) {
  return `${getServerEnv().APP_URL}/api/v1/email-accounts/${provider.toLowerCase()}/callback`;
}

export async function beginEmailConnection(userId: string, provider: EmailProvider) {
  await connectDatabase();
  const config = providerConfig(provider);
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  await OAuthState.create({ userId, provider, stateHash: stateHash(state), codeVerifierEnc: encryptSecret(verifier), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri(provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (provider === "GOOGLE") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }
  return url.toString();
}

async function exchangeCode(provider: EmailProvider, code: string, verifier: string) {
  const config = providerConfig(provider);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(provider)
  });
  const response = await fetch(config.tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new AppError("EMAIL_OAUTH_EXCHANGE_FAILED", 400, "The email provider rejected the authorization code.");
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number; scope?: string }>;
}

async function fetchIdentity(provider: EmailProvider, accessToken: string) {
  const url = provider === "GOOGLE" ? "https://www.googleapis.com/oauth2/v2/userinfo" : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new AppError("EMAIL_IDENTITY_FAILED", 400, "Unable to read the connected mailbox identity.");
  const data = await response.json() as { email?: string; mail?: string; userPrincipalName?: string };
  const email = data.email ?? data.mail ?? data.userPrincipalName;
  if (!email) throw new AppError("EMAIL_IDENTITY_MISSING", 400, "The provider did not return an email address.");
  return email.toLowerCase();
}

export async function completeEmailConnection(provider: EmailProvider, state: string, code: string) {
  await connectDatabase();
  const now = new Date();
  const record = await OAuthState.findOne({ provider, stateHash: stateHash(state), usedAt: null, expiresAt: { $gt: now } }).select("+codeVerifierEnc");
  if (!record) throw new AppError("INVALID_OAUTH_STATE", 400, "The email connection request expired or is invalid.");
  record.usedAt = now;
  await record.save();
  const token = await exchangeCode(provider, code, decryptSecret(record.codeVerifierEnc));
  const email = await fetchIdentity(provider, token.access_token);
  const existing = await EmailAccount.findOne({ userId: record.userId, provider, email }).select("+refreshTokenEnc");
  const refreshTokenEnc = token.refresh_token ? encryptSecret(token.refresh_token) : existing?.refreshTokenEnc ?? null;
  const account = await EmailAccount.findOneAndUpdate(
    { userId: record.userId, provider, email },
    { $set: {
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scopes: token.scope?.split(" ").filter(Boolean) ?? [],
      status: "CONNECTED",
      connectedAt: now,
      disconnectedAt: null
    } },
    { upsert: true, new: true, runValidators: true }
  ).lean();
  return { userId: record.userId.toString(), accountId: account._id.toString(), email, provider };
}

async function refreshAccessToken(accountId: string, userId: string) {
  const account = await EmailAccount.findOne({ _id: accountId, userId, status: "CONNECTED" }).select("+accessTokenEnc +refreshTokenEnc");
  if (!account) throw new AppError("EMAIL_ACCOUNT_NOT_FOUND", 404, "Connected email account not found.");
  if (!account.expiresAt || new Date(account.expiresAt).getTime() > Date.now() + 60_000) return { account, accessToken: decryptSecret(account.accessTokenEnc) };
  if (!account.refreshTokenEnc) {
    account.status = "REAUTH_REQUIRED";
    await account.save();
    throw new AppError("EMAIL_REAUTH_REQUIRED", 401, "Reconnect this email account to continue.");
  }
  const config = providerConfig(account.provider as EmailProvider);
  const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: decryptSecret(account.refreshTokenEnc), grant_type: "refresh_token" });
  if (account.provider === "MICROSOFT") body.set("scope", config.scopes.join(" "));
  const response = await fetch(config.tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) {
    account.status = "REAUTH_REQUIRED";
    await account.save();
    throw new AppError("EMAIL_REAUTH_REQUIRED", 401, "Reconnect this email account to continue.");
  }
  const token = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number };
  account.accessTokenEnc = encryptSecret(token.access_token);
  if (token.refresh_token) account.refreshTokenEnc = encryptSecret(token.refresh_token);
  account.expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
  await account.save();
  return { account, accessToken: token.access_token };
}

export async function listEmailAccounts(userId: string) {
  await connectDatabase();
  return EmailAccount.find({ userId, status: { $ne: "DISCONNECTED" } }).select("-accessTokenEnc -refreshTokenEnc").sort({ createdAt: -1 }).lean();
}

export async function disconnectEmailAccount(userId: string, accountId: string) {
  await connectDatabase();
  await EmailAccount.updateOne({ _id: accountId, userId }, { $set: { status: "DISCONNECTED", disconnectedAt: new Date(), accessTokenEnc: "revoked", refreshTokenEnc: null } });
}

function encodeRfc822(from: string, to: string, subject: string, body: string) {
  const message = [`From: ${from}`, `To: ${to}`, `Subject: ${subject.replace(/[\r\n]/g, " ")}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", body].join("\r\n");
  return Buffer.from(message, "utf8").toString("base64url");
}

export async function sendConnectedEmail(input: { userId: string; accountId: string; to: string; subject: string; body: string }) {
  await connectDatabase();
  await assertOutboundMailAllowed(input.userId, [input.to], "OUTREACH");
  const { account, accessToken } = await refreshAccessToken(input.accountId, input.userId);
  if (account.provider === "GOOGLE") {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ raw: encodeRfc822(account.email, input.to, input.subject, input.body) })
    });
    if (!response.ok) throw new AppError("EMAIL_SEND_FAILED", 502, "Gmail rejected the message.");
    const data = await response.json() as { id: string; threadId?: string };
    return { providerMessageId: data.id, providerThreadId: data.threadId ?? null };
  }
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { subject: input.subject, body: { contentType: "Text", content: input.body }, toRecipients: [{ emailAddress: { address: input.to } }] }, saveToSentItems: true })
  });
  if (!response.ok) throw new AppError("EMAIL_SEND_FAILED", 502, "Microsoft rejected the message.");
  return { providerMessageId: null, providerThreadId: null };
}

export async function syncEmailMetadata(userId: string, accountId: string) {
  await connectDatabase();
  const { account, accessToken } = await refreshAccessToken(accountId, userId);
  let synced = 0;
  if (account.provider === "GOOGLE") {
    const list = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25", { headers: { authorization: `Bearer ${accessToken}` } });
    if (!list.ok) throw new AppError("EMAIL_SYNC_FAILED", 502, "Unable to sync Gmail messages.");
    const data = await list.json() as { messages?: Array<{ id: string }> };
    for (const item of data.messages ?? []) {
      const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, { headers: { authorization: `Bearer ${accessToken}` } });
      if (!detail.ok) continue;
      const message = await detail.json() as { id: string; threadId?: string; snippet?: string; internalDate?: string; payload?: { headers?: Array<{ name: string; value: string }> } };
      const headers = Object.fromEntries((message.payload?.headers ?? []).map((header) => [header.name.toLowerCase(), header.value]));
      const direction = (headers.from ?? "").toLowerCase().includes(account.email.toLowerCase()) ? "OUTBOUND" : "INBOUND";
      await EmailMessage.updateOne(
        { emailAccountId: account._id, providerMessageId: message.id },
        { $setOnInsert: { userId, emailAccountId: account._id, providerMessageId: message.id, providerThreadId: message.threadId ?? null, direction, from: headers.from ?? "unknown", to: headers.to ? [headers.to] : [], subject: headers.subject ?? "", snippet: message.snippet ?? "", sentAt: direction === "OUTBOUND" && message.internalDate ? new Date(Number(message.internalDate)) : null, receivedAt: direction === "INBOUND" && message.internalDate ? new Date(Number(message.internalDate)) : null } },
        { upsert: true }
      );
      synced += 1;
    }
  } else {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=25&$select=id,conversationId,from,toRecipients,subject,bodyPreview,sentDateTime,receivedDateTime", { headers: { authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new AppError("EMAIL_SYNC_FAILED", 502, "Unable to sync Microsoft messages.");
    const data = await response.json() as { value?: Array<{ id: string; conversationId?: string; from?: { emailAddress?: { address?: string } }; toRecipients?: Array<{ emailAddress?: { address?: string }>; subject?: string; bodyPreview?: string; sentDateTime?: string; receivedDateTime?: string }> };
    for (const message of data.value ?? []) {
      const from = message.from?.emailAddress?.address ?? "unknown";
      const direction = from.toLowerCase() === account.email.toLowerCase() ? "OUTBOUND" : "INBOUND";
      await EmailMessage.updateOne(
        { emailAccountId: account._id, providerMessageId: message.id },
        { $setOnInsert: { userId, emailAccountId: account._id, providerMessageId: message.id, providerThreadId: message.conversationId ?? null, direction, from, to: (message.toRecipients ?? []).map((recipient) => recipient.emailAddress?.address ?? "").filter(Boolean), subject: message.subject ?? "", snippet: message.bodyPreview ?? "", sentAt: message.sentDateTime ? new Date(message.sentDateTime) : null, receivedAt: message.receivedDateTime ? new Date(message.receivedDateTime) : null } },
        { upsert: true }
      );
      synced += 1;
    }
  }
  await EmailAccount.updateOne({ _id: account._id }, { $set: { lastSyncedAt: new Date() } });
  return { synced };
}

export async function listEmailMessages(userId: string, limit = 100) {
  await connectDatabase();
  return EmailMessage.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(limit, 200)).lean();
}
