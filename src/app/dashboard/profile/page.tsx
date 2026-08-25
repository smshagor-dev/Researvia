import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getCurrentUser } from "@/server/auth/session";
import { getStudentProfile } from "@/server/profile/profile.service";

export const metadata = { title: "Academic profile | ResearVia" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getStudentProfile(user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-7 border-b border-slate-200 pb-6">
        <p className="text-sm font-medium text-slate-500">Student profile</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Academic profile</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Keep your academic background and goals accurate. This data stays private to your account unless a future feature clearly asks you to share it.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">{profile.completion}% complete</div>
        </div>
      </div>
      <ProfileForm initialProfile={profile} />
    </div>
  );
}
