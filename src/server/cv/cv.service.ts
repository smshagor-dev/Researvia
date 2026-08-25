import WordExtractor from "word-extractor";
import { connectDatabase } from "@/server/db/mongoose";
import { readStudentDocument } from "@/server/documents/document.service";
import { AppError } from "@/server/errors/AppError";
import { CvAnalysis } from "@/server/models/CvAnalysis";

const MAX_TEXT_CHARS = 120_000;
const sectionRules: Array<[string, RegExp]> = [
  ["summary", /\b(summary|profile|objective|about me)\b/i],
  ["education", /\b(education|academic background|qualifications?)\b/i],
  ["experience", /\b(experience|employment|work history|professional experience)\b/i],
  ["skills", /\b(skills?|technical skills|technologies|competencies)\b/i],
  ["research", /\b(research|research experience|research interests?)\b/i],
  ["projects", /\b(projects?|selected projects|academic projects)\b/i],
  ["publications", /\b(publications?|papers?|conference papers?|journal articles?)\b/i],
  ["awards", /\b(awards?|honou?rs?|scholarships?)\b/i],
  ["languages", /\b(languages?)\b/i]
];
const skillDictionary = ["python","typescript","javascript","java","c++","c#","go","rust","matlab","r","sql","mongodb","postgresql","mysql","react","next.js","node.js","laravel","django","fastapi","pytorch","tensorflow","scikit-learn","opencv","ros","docker","kubernetes","git","linux","aws","azure","gcp","machine learning","deep learning","computer vision","nlp","llm","data analysis","statistics","robotics","autonomous systems"];
const scoreWeights: Record<string, number> = { contact: 10, summary: 5, education: 15, experience: 15, skills: 15, research: 15, projects: 10, publications: 10, links: 5 };

function normalizeText(text: string) {
  return text.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT_CHARS);
}

async function extractDocumentText(mimeType: string, buffer: Buffer) {
  if (mimeType === "text/plain") return normalizeText(buffer.toString("utf8"));
  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return normalizeText(result.text);
    } finally {
      await parser.destroy();
    }
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return normalizeText(result.value);
  }
  if (mimeType === "application/msword") {
    const document = await new WordExtractor().extract(buffer);
    return normalizeText(document.getBody());
  }
  throw new AppError("CV_FORMAT_UNSUPPORTED", 400, "This document format cannot be analyzed.");
}

function lines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function unique(values: string[], limit = 30) {
  return [...new Set(values)].slice(0, limit);
}

function analyzeText(text: string) {
  if (text.length < 80) throw new AppError("CV_TEXT_UNREADABLE", 422, "The CV does not contain enough extractable text. Scanned-image PDFs may need OCR before analysis.");
  const lower = text.toLowerCase();
  const detected = sectionRules.filter(([, rule]) => rule.test(text)).map(([name]) => name);
  const hasContact = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
  const hasLinks = /https?:\/\/|linkedin\.com|github\.com|orcid\.org|scholar\.google/i.test(text);
  if (hasContact) detected.push("contact");
  if (hasLinks) detected.push("links");

  const extractedSkills = unique(skillDictionary.filter((skill) => lower.includes(skill)));
  const allLines = lines(text);
  const extractedEducation = unique(allLines.filter((line) => /\b(university|college|institute|bachelor|master|msc|bsc|ph\.?d|doctorate|degree)\b/i.test(line)), 20);
  const extractedPublications = unique(allLines.filter((line) => /\b(doi:|doi\.org|journal|conference|proceedings|publication|published|arxiv)\b/i.test(line)), 20);

  const detectedSet = new Set(detected);
  const scoringSections = Object.keys(scoreWeights);
  const score = scoringSections.reduce((total, section) => total + (detectedSet.has(section) ? scoreWeights[section]! : 0), 0);
  const missingSections = scoringSections.filter((section) => !detectedSet.has(section));
  const suggestions: string[] = [];
  if (!detectedSet.has("contact")) suggestions.push("Add a professional email address in the header.");
  if (!detectedSet.has("summary")) suggestions.push("Add a concise academic or research profile tailored to your target role or program.");
  if (!detectedSet.has("research")) suggestions.push("Add research interests or research experience with methods and measurable outcomes.");
  if (!detectedSet.has("projects")) suggestions.push("Add selected academic or engineering projects that demonstrate relevant skills.");
  if (!detectedSet.has("publications")) suggestions.push("If applicable, include verified publications, preprints, posters, or conference work; do not invent citations.");
  if (extractedSkills.length < 4) suggestions.push("Make relevant technical and research skills explicit instead of relying only on project descriptions.");
  if (!detectedSet.has("links")) suggestions.push("Consider adding relevant professional links such as ORCID, Google Scholar, GitHub, or LinkedIn.");
  if (text.length > 18_000) suggestions.push("The CV is text-heavy; review whether lower-priority details can be shortened for the target application.");

  return { score, detectedSections: unique(detected), missingSections, extractedSkills, extractedPublications, extractedEducation, suggestions: unique(suggestions, 12) };
}

export async function analyzeCv(userId: string, documentId: string) {
  await connectDatabase();
  const { document, buffer } = await readStudentDocument(userId, documentId);
  if (document.kind !== "CV") throw new AppError("CV_DOCUMENT_REQUIRED", 400, "Select a document marked as CV.");
  const text = await extractDocumentText(document.mimeType, buffer);
  const analysis = analyzeText(text);
  return CvAnalysis.findOneAndUpdate(
    { userId, documentId },
    { $set: { ...analysis, method: "DETERMINISTIC" } },
    { upsert: true, new: true, runValidators: true }
  ).lean();
}

export async function listCvAnalyses(userId: string) {
  await connectDatabase();
  return CvAnalysis.find({ userId }).sort({ updatedAt: -1 }).populate("documentId", "originalName mimeType kind createdAt").lean();
}
