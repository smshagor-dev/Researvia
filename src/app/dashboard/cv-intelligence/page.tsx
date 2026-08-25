import { CvIntelligencePanel } from "@/components/cv/CvIntelligencePanel";
import { getCurrentUser } from "@/server/auth/session";
import { listCvAnalyses } from "@/server/cv/cv.service";
import { listStudentDocuments } from "@/server/documents/document.service";

export default async function CvIntelligencePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [documents, analyses] = await Promise.all([listStudentDocuments(user.id), listCvAnalyses(user.id)]);
  return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Deterministic academic guidance</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">CV Intelligence</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Analyze structure, visible skills, research sections, and gaps without a paid AI dependency. This score is a document-readiness heuristic, not an admissions or hiring probability.</p></div><CvIntelligencePanel documents={documents.filter((document) => document.kind === "CV").map((document) => ({ id: document._id.toString(), name: document.originalName }))} analyses={analyses.map((analysis) => ({ id: analysis._id.toString(), documentName: typeof analysis.documentId === "object" && analysis.documentId && "originalName" in analysis.documentId ? String(analysis.documentId.originalName) : "CV", score: analysis.score, detectedSections: analysis.detectedSections, missingSections: analysis.missingSections, extractedSkills: analysis.extractedSkills, suggestions: analysis.suggestions, updatedAt: new Date(analysis.updatedAt).toISOString() }))} /></div>;
}
