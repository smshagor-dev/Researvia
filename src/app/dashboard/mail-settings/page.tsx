import { redirect } from "next/navigation";
import { ImapSyncPanel } from "@/components/email/ImapSyncPanel";
import { MailAutomationPanel } from "@/components/email/MailAutomationPanel";
import { MailSettingsForm } from "@/components/email/MailSettingsForm";
import { getCurrentUser } from "@/server/auth/session";
import { getMailAutomation } from "@/server/email/mail-automation.service";
import { ensureSystemMailbox } from "@/server/email/system-mailbox.service";
import { getSystemMailSettings } from "@/server/email/system-mail-settings.service";

export default async function MailSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [mailbox, settings, automation] = await Promise.all([
    ensureSystemMailbox(user.id),
    getSystemMailSettings(user.id),
    getMailAutomation(user.id)
  ]);
  return (
    <>
      <MailSettingsForm initialMailbox={{ address: mailbox.address, displayName: mailbox.displayName, status: mailbox.status }} initialSettings={settings} />
      <ImapSyncPanel initialSettings={settings} />
      <MailAutomationPanel initialAutomation={automation} />
    </>
  );
}
