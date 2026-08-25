import { DocumentManager } from "@/components/documents/DocumentManager";
import { getCurrentUser } from "@/server/auth/session";
import { listStudentDocuments } from "@/server/documents/document.service";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const documents = await listStudentDocuments(user.id);
  return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Application assets</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Documents</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Keep your CV, transcripts, SOP drafts, and research proposals private and ready for applications or outreach.</p></div><DocumentManager documents={documents.map((document) => ({ id: document._id.toString(), kind: document.kind, name: document.originalName, mimeType: document.mimeType, size: document.size, createdAt: new Date(document.createdAt).toISOString() }))} /></div>;
}
