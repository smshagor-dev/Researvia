import { cookies } from "next/headers";
import { type NextResponse } from "next/server";
import { connectDatabase } from "@/server/db/mongoose";
import { User } from "@/server/models/User";
import { UserSession } from "@/server/models/UserSession";
import { createOpaqueToken, hashOpaqueToken } from "@/server/security/opaque-token";

const NORMAL_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const REMEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  displayName: string;
  email: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  emailVerifiedAt: string | null;
};

export function getSessionCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-researvia_session" : "researvia_session";
}

export async function createSession(input: {
  userId: string;
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  await connectDatabase();
  const { token, tokenHash } = createOpaqueToken();
  const expiresAt = new Date(Date.now() + (input.rememberMe ? REMEMBER_SESSION_MS : NORMAL_SESSION_MS));

  await UserSession.create({
    userId: input.userId,
    tokenHash,
    expiresAt,
    lastSeenAt: new Date(),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return { token, expiresAt };
}

export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await connectDatabase();
  await UserSession.updateOne(
    { tokenHash: hashOpaqueToken(token), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export async function getUserBySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  await connectDatabase();

  const now = new Date();
  const session = await UserSession.findOne({
    tokenHash: hashOpaqueToken(token),
    revokedAt: null,
    expiresAt: { $gt: now }
  }).lean();

  if (!session) return null;

  const user = await User.findOne({ _id: session.userId, status: "ACTIVE" }).lean();
  if (!user) return null;

  if (now.getTime() - new Date(session.lastSeenAt).getTime() > 5 * 60 * 1000) {
    void UserSession.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } }).catch(() => undefined);
  }

  return {
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    role: user.role as SessionUser["role"],
    emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt).toISOString() : null
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return getUserBySessionToken(cookieStore.get(getSessionCookieName())?.value);
}
