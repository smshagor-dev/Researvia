import { redirect } from "next/navigation";
import { SystemMailboxClient } from "@/components/email/SystemMailboxClient";
import { getCurrentUser } from "@/server/auth/session";
import { listSystemMailbox } from "@/server/email/system-mailbox.service";

export default async function SystemMailboxPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [data, params] = await Promise.all([listSystemMailbox(user.id, { folder: "INBOX" }), searchParams]);
  return <SystemMailboxClient initialData={data} initialMessageId={params.message?.slice(0, 64) ?? ""} />;
}
