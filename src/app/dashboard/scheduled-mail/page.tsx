import { redirect } from "next/navigation";
import { ScheduledMailManager } from "@/components/email/ScheduledMailManager";
import { getCurrentUser } from "@/server/auth/session";
import { listScheduledSystemMail } from "@/server/email/scheduled-mail.service";

export default async function ScheduledMailPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const messages = await listScheduledSystemMail(user.id);
  return <ScheduledMailManager initialMessages={messages} />;
}
