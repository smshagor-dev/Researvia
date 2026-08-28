"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Folder = "INBOX" | "STARRED" | "SENT" | "DRAFTS" | "TRASH";
type Attachment = { fileId: string; filename: string; contentType: string; size: number };
type SenderIdentity = {
  id: string;
  address: string;
  localPart: string;
  label: string;
  displayName: string;
  replyTo: string;
  status: string;
  isDefault: boolean;
  isPrimary: boolean;
  lastReceivedAt: string | null;
  lastSentAt: string | null;
};
type MailMessage = {
  id: string;
  internetMessageId: string;
  threadKey: string;
  direction: string;
  folder: string;
  from: string;
  to: string[];
  cc: string[];
  replyTo: string | null;
  subject: string;
  textBody: string;
  snippet: string;
  attachments: Attachment[];
  readAt: string | null;
  starredAt: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string | null;
};
type MailboxData = {
  mailbox: { id: string; address: string; displayName: string; status: string; quotaBytes: number; usedBytes: number };
  senders: SenderIdentity[];
  counts: { inboxUnread: number; inbox: number; starred: number; sent: number; drafts: number; trash: number };
  messages: MailMessage[];
};
type ThreadData = { message: MailMessage; thread: MailMessage[] };
type ApiEnvelope<T> = { data?: T; error?: { message?: string } };

const folders: Array<{ key: Folder; label: string }> = [
  { key: "INBOX", label: "Inbox" },
  { key: "STARRED", label: "Starred" },
  { key: "SENT", label: "Sent" },
  { key: "DRAFTS", label: "Drafts" },
  { key: "TRASH", label: "Trash" }
];

function folderCount(data: MailboxData, folder: Folder) {
  if (folder === "INBOX") return data.counts.inboxUnread || data.counts.inbox;
  if (folder === "STARRED") return data.counts.starred;
  if (folder === "SENT") return data.counts.sent;
  if (folder === "DRAFTS") return data.counts.drafts;
  return data.counts.trash;
}

function fmt(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function bytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function splitAddresses(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function reSubject(subject: string) {
  return /^re:/i.test(subject) ? subject : `Re: ${subject || "(no subject)"}`;
}

function activeSenders(data: MailboxData) {
  return data.senders.filter((identity) => identity.status === "ACTIVE");
}

function defaultSender(data: MailboxData) {
  const active = activeSenders(data);
  return active.find((identity) => identity.isDefault) ?? active.find((identity) => identity.isPrimary) ?? active[0] ?? null;
}

function replySender(data: MailboxData, message: MailMessage) {
  const active = activeSenders(data);
  const addresses = new Set(message.to.map((address) => address.toLowerCase()));
  return active.find((identity) => addresses.has(identity.address.toLowerCase())) ?? defaultSender(data);
}

export function SystemMailboxClient({ initialData, initialMessageId = "" }: { initialData: MailboxData; initialMessageId?: string }) {
  const [data, setData] = useState(initialData);
  const [folder, setFolder] = useState<Folder>("INBOX");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compose, setCompose] = useState(false);
  const [fromAddress, setFromAddress] = useState(() => defaultSender(initialData)?.address ?? initialData.mailbox.address);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const openedInitial = useRef(false);
  const draftGeneration = useRef(0);

  async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const body = await response.json() as ApiEnvelope<T>;
    if (!response.ok) throw new Error(body.error?.message || "Request failed.");
    if (!body.data) throw new Error("Unexpected server response.");
    return body.data;
  }

  async function refresh(nextFolder = folder, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const next = await api<MailboxData>(`/api/v1/me/mailbox?folder=${encodeURIComponent(nextFolder)}&q=${encodeURIComponent(nextQuery)}`);
      setData(next);
      setFromAddress((current) => activeSenders(next).some((identity) => identity.address === current) ? current : defaultSender(next)?.address ?? next.mailbox.address);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mailbox could not be refreshed.");
    } finally {
      setLoading(false);
    }
  }

  async function chooseFolder(next: Folder) {
    setFolder(next);
    setSelected(null);
    await refresh(next, query);
  }

  async function openMessage(message: MailMessage | string) {
    const id = typeof message === "string" ? message : message.id;
    const row = typeof message === "string" ? null : message;
    if (row?.folder === "DRAFTS") {
      const sender = activeSenders(data).find((identity) => identity.address.toLowerCase() === row.from.toLowerCase()) ?? defaultSender(data);
      setFromAddress(sender?.address ?? data.mailbox.address);
      setTo(row.to.join(", "));
      setCc(row.cc.join(", "));
      setSubject(row.subject);
      setText(row.textBody);
      setDraftId(row.id);
      setReplyToMessageId(null);
      setFiles([]);
      setCompose(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const thread = await api<ThreadData>(`/api/v1/me/mailbox/messages/${encodeURIComponent(id)}`);
      setSelected(thread);
      if (!thread.message.readAt) {
        await api(`/api/v1/me/mailbox/messages/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ read: true })
        });
        setData((current) => ({
          ...current,
          counts: { ...current.counts, inboxUnread: Math.max(0, current.counts.inboxUnread - (thread.message.folder === "INBOX" ? 1 : 0)) },
          messages: current.messages.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item)
        }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be opened.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialMessageId || openedInitial.current) return;
    openedInitial.current = true;
    void openMessage(initialMessageId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessageId]);

  function resetCompose() {
    draftGeneration.current += 1;
    setCompose(false);
    setFromAddress(defaultSender(data)?.address ?? data.mailbox.address);
    setTo("");
    setCc("");
    setSubject("");
    setText("");
    setReplyToMessageId(null);
    setDraftId(null);
    setFiles([]);
    setDraftStatus("");
  }

  function startCompose() {
    resetCompose();
    setCompose(true);
  }

  function startReply(message: MailMessage) {
    const sender = replySender(data, message);
    setFromAddress(sender?.address ?? data.mailbox.address);
    setTo(message.replyTo || message.from);
    setCc("");
    setSubject(reSubject(message.subject));
    setText("");
    setReplyToMessageId(message.id);
    setDraftId(null);
    setFiles([]);
    setDraftStatus("");
    setCompose(true);
  }

  useEffect(() => {
    if (!compose || files.length > 0 || (!to.trim() && !cc.trim() && !subject.trim() && !text.trim())) return;
    const generation = ++draftGeneration.current;
    setDraftStatus("Saving…");
    const timer = setTimeout(async () => {
      try {
        const result = await api<{ message: MailMessage }>("/api/v1/me/mailbox", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: draftId || undefined, fromAddress, to: splitAddresses(to), cc: splitAddresses(cc), subject, text })
        });
        if (generation !== draftGeneration.current) return;
        setDraftId(result.message.id);
        setDraftStatus("Saved");
      } catch {
        if (generation === draftGeneration.current) setDraftStatus("Draft not saved");
      }
    }, 1200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compose, fromAddress, to, cc, subject, text, files.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    draftGeneration.current += 1;
    try {
      const form = new FormData();
      form.set("fromAddress", fromAddress);
      form.set("to", JSON.stringify(splitAddresses(to)));
      form.set("cc", JSON.stringify(splitAddresses(cc)));
      form.set("subject", subject);
      form.set("text", text);
      if (replyToMessageId) form.set("replyToMessageId", replyToMessageId);
      if (draftId) form.set("draftId", draftId);
      for (const file of files) form.append("attachments", file);
      await api<{ message: MailMessage }>("/api/v1/me/mailbox/send", { method: "POST", body: form });
      resetCompose();
      await refresh(folder, query);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Email could not be sent.");
    } finally {
      setSending(false);
    }
  }

  async function patchMessage(message: MailMessage, patch: Record<string, unknown>) {
    setError("");
    try {
      const result = await api<{ message: MailMessage }>(`/api/v1/me/mailbox/messages/${encodeURIComponent(message.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch)
      });
      setData((current) => ({ ...current, messages: current.messages.map((item) => item.id === message.id ? result.message : item) }));
      if (selected?.message.id === message.id) setSelected((current) => current ? { ...current, message: result.message } : current);
      if (patch.folder) {
        setSelected(null);
        await refresh(folder, query);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be updated.");
    }
  }

  const selectedMessage = selected?.message ?? null;
  const senderOptions = activeSenders(data);
  const selectedSender = senderOptions.find((identity) => identity.address === fromAddress) ?? defaultSender(data);
  const storagePercent = useMemo(() => data.mailbox.quotaBytes > 0 ? Math.min(100, Math.round((data.mailbox.usedBytes / data.mailbox.quotaBytes) * 100)) : 0, [data.mailbox]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Your ResearVia email</p>
          <div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="truncate text-xl font-semibold text-slate-950">{data.mailbox.address}</h1><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{data.mailbox.status.toLowerCase()}</span>{senderOptions.length > 1 ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{senderOptions.length} sender identities</span> : null}</div>
          <p className="mt-1 text-sm text-slate-500">Professors can reply to your primary address or any active alias. All messages arrive in this Inbox.</p>
        </div>
        <button type="button" onClick={startCompose} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Compose</button>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid lg:min-h-[680px] lg:grid-cols-[190px_360px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 p-3 lg:border-b-0 lg:border-r">
          <button type="button" onClick={startCompose} className="mb-4 hidden w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white lg:block">+ Compose</button>
          <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-1" aria-label="Mailbox folders">
            {folders.map((item) => {
              const active = folder === item.key;
              const count = folderCount(data, item.key);
              return <button key={item.key} type="button" onClick={() => void chooseFolder(item.key)} className={`flex min-w-max items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium lg:w-full ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}><span>{item.label}</span>{count ? <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15" : "bg-slate-100"}`}>{count}</span> : null}</button>;
            })}
          </nav>
          <div className="mt-6 hidden lg:block">
            <div className="flex items-center justify-between text-xs text-slate-500"><span>Storage</span><span>{storagePercent}%</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-950" style={{ width: `${storagePercent}%` }}/></div>
            <p className="mt-2 text-xs text-slate-400">{bytes(data.mailbox.usedBytes)} of {bytes(data.mailbox.quotaBytes)}</p>
          </div>
        </aside>

        <section className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <form onSubmit={(event) => { event.preventDefault(); void refresh(folder, query); }} className="border-b border-slate-100 p-3">
            <div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mail" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white"/><button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700" type="submit">Search</button></div>
          </form>
          <div className="max-h-[360px] overflow-y-auto lg:max-h-[630px]">
            {loading && data.messages.length === 0 ? <p className="p-6 text-sm text-slate-500">Loading mail…</p> : data.messages.length ? data.messages.map((message) => {
              const active = selectedMessage?.id === message.id;
              const unread = !message.readAt && message.folder === "INBOX";
              return <div key={message.id} className={`group border-b border-slate-100 ${active ? "bg-slate-100" : unread ? "bg-white" : "bg-slate-50/40"}`}>
                <button type="button" onClick={() => void openMessage(message)} className="w-full px-4 py-3 text-left">
                  <div className="flex items-start gap-3">
                    <span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); void patchMessage(message, { starred: !message.starredAt }); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); void patchMessage(message, { starred: !message.starredAt }); } }} className={`mt-0.5 text-lg ${message.starredAt ? "text-amber-500" : "text-slate-300 hover:text-amber-500"}`} aria-label={message.starredAt ? "Unstar" : "Star"}>{message.starredAt ? "★" : "☆"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3"><p className={`truncate text-sm ${unread ? "font-bold text-slate-950" : "font-medium text-slate-700"}`}>{message.direction === "OUTBOUND" ? `To: ${message.to.join(", ")}` : message.from}</p><span className="shrink-0 text-[11px] text-slate-400">{fmt(message.receivedAt || message.sentAt || message.createdAt)}</span></div>
                      <p className={`mt-1 truncate text-sm ${unread ? "font-semibold text-slate-900" : "text-slate-700"}`}>{message.folder === "DRAFTS" ? <span className="mr-1 text-rose-600">Draft</span> : null}{message.subject || "(no subject)"}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{message.snippet || "No preview"}</p>
                      {message.attachments.length ? <p className="mt-2 text-[11px] font-medium text-slate-500">📎 {message.attachments.length} attachment{message.attachments.length === 1 ? "" : "s"}</p> : null}
                    </div>
                  </div>
                </button>
              </div>;
            }) : <div className="p-8 text-center text-sm text-slate-500">No messages in {folders.find((item) => item.key === folder)?.label.toLowerCase()}.</div>}
          </div>
        </section>

        <section className="min-h-[360px] bg-white">
          {selected ? <div className="h-full">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0"><h2 className="truncate text-lg font-semibold text-slate-950">{selected.message.subject || "(no subject)"}</h2><p className="mt-1 text-xs text-slate-400">{selected.thread.length} message{selected.thread.length === 1 ? "" : "s"} in this conversation</p></div>
              <div className="flex items-center gap-2"><button type="button" onClick={() => void patchMessage(selected.message, { starred: !selected.message.starredAt })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">{selected.message.starredAt ? "★" : "☆"}</button><button type="button" onClick={() => void patchMessage(selected.message, { folder: "TRASH" })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">Trash</button></div>
            </div>
            <div className="max-h-[555px] space-y-4 overflow-y-auto p-5">
              {selected.thread.map((message) => <article key={message.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{message.from}</p><p className="mt-1 text-xs text-slate-500">to {message.to.join(", ") || "—"}</p></div><span className="text-xs text-slate-400">{message.receivedAt ? new Date(message.receivedAt).toLocaleString() : message.sentAt ? new Date(message.sentAt).toLocaleString() : ""}</span></div>
                <div className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{message.textBody || message.snippet || "(empty message)"}</div>
                {message.attachments.length ? <div className="mt-5 flex flex-wrap gap-2">{message.attachments.map((attachment) => <a key={attachment.fileId} href={`/api/v1/me/mailbox/messages/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(attachment.fileId)}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">📎 {attachment.filename} · {bytes(attachment.size)}</a>)}</div> : null}
                {message.direction === "INBOUND" ? <div className="mt-5"><button type="button" onClick={() => startReply(message)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Reply</button></div> : null}
              </article>)}
            </div>
          </div> : <div className="grid h-full min-h-[360px] place-items-center p-8 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-xl">✉</div><h2 className="mt-4 font-semibold text-slate-900">Select an email</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Read conversations, download attachments, star messages, or reply from the same identity that received the email.</p></div></div>}
        </section>
      </div>

      {compose ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/20 p-3 sm:items-end sm:justify-end sm:p-5" onMouseDown={(event) => { if (event.currentTarget === event.target) setCompose(false); }}>
        <form onSubmit={send} className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white"><div><p className="text-sm font-semibold">New message</p><p className="mt-0.5 text-[11px] text-slate-300">From {selectedSender?.label || (selectedSender?.isPrimary ? "Primary mailbox" : "Sender identity")}: {fromAddress}</p></div><button type="button" onClick={() => setCompose(false)} className="rounded px-2 py-1 text-xl leading-none text-slate-300 hover:bg-white/10 hover:text-white">×</button></div>
          <div className="divide-y divide-slate-100">
            <label className="flex items-center gap-3 px-4 py-2.5 text-sm"><span className="w-10 shrink-0 text-slate-500">From</span><select value={fromAddress} onChange={(event) => setFromAddress(event.target.value)} className="min-w-0 flex-1 bg-transparent py-1 font-medium text-slate-800 outline-none">{senderOptions.map((identity) => <option key={identity.id} value={identity.address}>{identity.displayName ? `${identity.displayName} <${identity.address}>` : identity.address}{identity.isDefault ? " — default" : ""}</option>)}</select></label>
            <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="To (comma separated)" className="w-full px-4 py-3 text-sm outline-none" required/>
            <input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="Cc" className="w-full px-4 py-3 text-sm outline-none"/>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="w-full px-4 py-3 text-sm outline-none"/>
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Write your message…" className="min-h-64 w-full resize-y px-4 py-4 text-sm leading-6 outline-none" required/>
          </div>
          {files.length ? <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">{files.map((file, index) => <button key={`${file.name}-${index}`} type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700">{file.name} ×</button>)}</div> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3"><div className="flex items-center gap-3"><button disabled={sending || senderOptions.length === 0} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" type="submit">{sending ? "Sending…" : "Send"}</button><label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">📎 Attach<input type="file" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files ?? []))}/></label></div><span className={`text-xs ${draftStatus === "Draft not saved" ? "text-rose-600" : "text-slate-400"}`}>{files.length ? "Attachments save when sent" : draftStatus}</span></div>
        </form>
      </div> : null}
    </div>
  );
}
