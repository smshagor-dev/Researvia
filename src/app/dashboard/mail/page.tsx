import { redirect } from "next/navigation";
import { ScheduledMailPanel } from "@/components/email/ScheduledMailPanel";
import { SystemMailboxClient } from "@/components/email/SystemMailboxClient";
import { getCurrentUser } from "@/server/auth/session";
import { listScheduledSystemMail } from "@/server/email/scheduled-mail.service";
import { listSystemMailbox } from "@/server/email/system-mailbox.service";

export default async function SystemMailboxPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [data, scheduled, params] = await Promise.all([
    listSystemMailbox(user.id, { folder: "INBOX" }),
    listScheduledSystemMail(user.id),
    searchParams
  ]);
  return <div className="space-y-4"><SystemMailboxClient initialData={data} initialMessageId={params.message?.slice(0, 64) ?? ""} /><ScheduledMailPanel initialMessages={scheduled} /></div>;
}
