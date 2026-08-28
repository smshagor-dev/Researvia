import { redirect } from "next/navigation";
import { ScheduledMailManager } from "@/components/email/ScheduledMailManager";
import { getCurrentUser } from "@/server/auth/session";
import { listSystemMailSenderIdentities } from "@/server/email/system-mail-alias.service";
import { listScheduledSystemMail } from "@/server/email/scheduled-mail.service";

export default async function ScheduledMailPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [messages, senders] = await Promise.all([
    listScheduledSystemMail(user.id),
    listSystemMailSenderIdentities(user.id)
  ]);
  return <ScheduledMailManager initialMessages={messages} initialSenders={senders} />;
}
