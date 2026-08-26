import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getCurrentUser } from "@/server/auth/session";
import { listStudentDocuments } from "@/server/documents/document.service";
import { calculateExtendedProfileCompletion, getAllStudentProfileSections } from "@/server/profile/profile-sections.service";
import { getStudentProfile } from "@/server/profile/profile.service";

export const metadata = { title: "Academic profile | ResearVia" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");

  const [profile, sections, documents] = await Promise.all([
    getStudentProfile(user.id),
    getAllStudentProfileSections(user.id),
    listStudentDocuments(user.id)
  ]);
  const completion = calculateExtendedProfileCompletion(
    profile as unknown as Record<string, unknown>,
    sections
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 border-b border-slate-200 pb-6">
        <p className="text-sm font-medium text-slate-500">Student profile</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Academic & research profile</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Build one structured CV-grade profile for Professor Finder, research matching, scholarships and future applications. Every tab saves independently, so updating one section never overwrites another.</p>
          </div>
          <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">{completion}% research-ready</div>
        </div>
      </div>
      <ProfileForm
        initialProfile={profile}
        initialSections={sections}
        defaultName={user.displayName}
        documents={documents.map((document) => ({
          id: document._id.toString(),
          kind: document.kind,
          name: document.originalName,
          mimeType: document.mimeType,
          size: document.size,
          createdAt: new Date(document.createdAt).toISOString()
        }))}
      />
    </div>
  );
}
