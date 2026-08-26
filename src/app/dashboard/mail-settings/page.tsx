import { redirect } from "next/navigation";
import { ImapSyncPanel } from "@/components/email/ImapSyncPanel";
import { MailSettingsForm } from "@/components/email/MailSettingsForm";
import { getCurrentUser } from "@/server/auth/session";
import { ensureSystemMailbox } from "@/server/email/system-mailbox.service";
import { getSystemMailSettings } from "@/server/email/system-mail-settings.service";

export default async function MailSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [mailbox, settings] = await Promise.all([ensureSystemMailbox(user.id), getSystemMailSettings(user.id)]);
  return (
    <>
      <MailSettingsForm initialMailbox={{ address: mailbox.address, displayName: mailbox.displayName, status: mailbox.status }} initialSettings={settings} />
      <ImapSyncPanel initialSettings={settings} />
    </>
  );
}
