import { redirect } from "next/navigation";
import { ImapSyncPanel } from "@/components/email/ImapSyncPanel";
import { MailAliasesPanel } from "@/components/email/MailAliasesPanel";
import { MailSettingsForm } from "@/components/email/MailSettingsForm";
import { VacationResponderSettings } from "@/components/email/VacationResponderSettings";
import { getCurrentUser } from "@/server/auth/session";
import { listSystemMailSenderIdentities } from "@/server/email/system-mail-alias.service";
import { ensureSystemMailbox } from "@/server/email/system-mailbox.service";
import { getSystemMailSettings } from "@/server/email/system-mail-settings.service";
import { getVacationResponderSettings } from "@/server/email/vacation-responder.service";

export default async function MailSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const mailbox = await ensureSystemMailbox(user.id);
  const [settings, vacationSettings, identities] = await Promise.all([
    getSystemMailSettings(user.id),
    getVacationResponderSettings(user.id),
    listSystemMailSenderIdentities(user.id)
  ]);
  return (
    <>
      <MailSettingsForm initialMailbox={{ address: mailbox.address, displayName: mailbox.displayName, status: mailbox.status }} initialSettings={settings} />
      <MailAliasesPanel initialIdentities={identities} />
      <VacationResponderSettings initialSettings={vacationSettings} />
      <ImapSyncPanel initialSettings={settings} />
    </>
  );
}
