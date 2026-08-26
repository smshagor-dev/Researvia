import type { ProfileSectionKey } from "@/schemas/student-profile-sections";

export type ProfileFieldType = "text" | "textarea" | "date" | "number" | "url" | "email" | "list" | "select" | "checkbox";
export type ProfileField = {
  name: string;
  label: string;
  type: ProfileFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  wide?: boolean;
  required?: boolean;
};
export type ProfileSectionConfig = {
  key: ProfileSectionKey;
  label: string;
  description: string;
  repeatable: boolean;
  itemLabel: string;
  fields: ProfileField[];
};

const yesNoFunding = [
  { value: "ANY", label: "Any funding option" },
  { value: "FULLY_FUNDED", label: "Fully funded only" },
  { value: "FULL_OR_PARTIAL", label: "Full or partial funding" },
  { value: "SELF_FUNDED", label: "Self funded" }
];

export const studentProfileSections: ProfileSectionConfig[] = [
  {
    key: "education", label: "Education", description: "Degrees, institutions, GPA, thesis and academic achievements.", repeatable: true, itemLabel: "education record",
    fields: [
      { name: "institution", label: "Institution", type: "text", required: true }, { name: "degree", label: "Degree", type: "text", required: true },
      { name: "fieldOfStudy", label: "Field / major", type: "text" }, { name: "department", label: "Department", type: "text" },
      { name: "startDate", label: "Start date", type: "date" }, { name: "endDate", label: "End / expected graduation", type: "date" },
      { name: "currentlyStudying", label: "Currently studying here", type: "checkbox", wide: true },
      { name: "gpa", label: "GPA / CGPA", type: "text", placeholder: "3.75" }, { name: "gpaScale", label: "GPA scale", type: "text", placeholder: "4.00" },
      { name: "percentage", label: "Percentage", type: "number" }, { name: "thesisSupervisor", label: "Thesis supervisor", type: "text" },
      { name: "thesisTitle", label: "Thesis title", type: "textarea", wide: true },
      { name: "coursework", label: "Relevant coursework", type: "list", placeholder: "AI, Algorithms, Robotics", wide: true },
      { name: "achievements", label: "Honors / achievements", type: "list", wide: true }
    ]
  },
  {
    key: "research-profile", label: "Research profile", description: "Core research direction used heavily by Professor Finder.", repeatable: false, itemLabel: "research profile",
    fields: [
      { name: "primaryArea", label: "Primary research area", type: "text" }, { name: "secondaryAreas", label: "Secondary areas", type: "list" },
      { name: "keywords", label: "Research keywords", type: "list", wide: true }, { name: "researchMethods", label: "Research methods", type: "list", wide: true },
      { name: "preferredDomains", label: "Preferred domains", type: "list", wide: true }, { name: "researchObjective", label: "Research objective", type: "textarea", wide: true }
    ]
  },
  {
    key: "research-experience", label: "Research experience", description: "Labs, supervisors, methods, tools and outcomes.", repeatable: true, itemLabel: "research experience",
    fields: [
      { name: "role", label: "Research role", type: "text", required: true }, { name: "institution", label: "Institution", type: "text" },
      { name: "lab", label: "Lab / group", type: "text" }, { name: "supervisor", label: "Supervisor", type: "text" },
      { name: "researchArea", label: "Research area", type: "text", wide: true }, { name: "startDate", label: "Start date", type: "date" }, { name: "endDate", label: "End date", type: "date" },
      { name: "currentlyActive", label: "Currently active", type: "checkbox", wide: true }, { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "methodology", label: "Methodology", type: "list", wide: true }, { name: "tools", label: "Tools / technologies", type: "list", wide: true },
      { name: "outcomes", label: "Research outcomes", type: "list", wide: true }
    ]
  },
  {
    key: "work-experience", label: "Work experience", description: "Professional and industry experience relevant to your academic profile.", repeatable: true, itemLabel: "work experience",
    fields: [
      { name: "jobTitle", label: "Job title", type: "text", required: true }, { name: "organization", label: "Organization", type: "text", required: true },
      { name: "employmentType", label: "Employment type", type: "text" }, { name: "location", label: "Location", type: "text" },
      { name: "workMode", label: "Work mode", type: "select", options: [{ value: "", label: "Not specified" }, { value: "REMOTE", label: "Remote" }, { value: "HYBRID", label: "Hybrid" }, { value: "ONSITE", label: "On-site" }] },
      { name: "startDate", label: "Start date", type: "date" }, { name: "endDate", label: "End date", type: "date" }, { name: "currentlyWorking", label: "Currently working", type: "checkbox", wide: true },
      { name: "description", label: "Description", type: "textarea", wide: true }, { name: "responsibilities", label: "Responsibilities", type: "list", wide: true },
      { name: "achievements", label: "Achievements", type: "list", wide: true }, { name: "technologies", label: "Technologies", type: "list", wide: true }
    ]
  },
  {
    key: "skills", label: "Skills", description: "Technical, research, tooling and soft skills with proficiency.", repeatable: true, itemLabel: "skill",
    fields: [
      { name: "name", label: "Skill", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: [{ value: "TECHNICAL", label: "Technical" }, { value: "RESEARCH", label: "Research" }, { value: "TOOL", label: "Tool" }, { value: "SOFT", label: "Soft skill" }] },
      { name: "proficiency", label: "Proficiency", type: "select", options: [{ value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" }, { value: "ADVANCED", label: "Advanced" }, { value: "EXPERT", label: "Expert" }] },
      { name: "yearsExperience", label: "Years of experience", type: "number" }
    ]
  },
  {
    key: "projects", label: "Projects", description: "Academic, research and technical projects.", repeatable: true, itemLabel: "project",
    fields: [
      { name: "name", label: "Project name", type: "text", required: true }, { name: "projectType", label: "Project type", type: "text" }, { name: "role", label: "Your role", type: "text" },
      { name: "startDate", label: "Start date", type: "date" }, { name: "endDate", label: "End date", type: "date" }, { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "technologies", label: "Technologies", type: "list", wide: true }, { name: "researchAreas", label: "Research areas", type: "list", wide: true }, { name: "achievements", label: "Key achievements", type: "list", wide: true },
      { name: "projectUrl", label: "Project URL", type: "url" }, { name: "repositoryUrl", label: "Repository URL", type: "url" }, { name: "demoUrl", label: "Demo URL", type: "url" }
    ]
  },
  {
    key: "publications", label: "Publications", description: "Published, submitted and in-progress scholarly work.", repeatable: true, itemLabel: "publication",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, wide: true },
      { name: "publicationType", label: "Type", type: "select", options: ["JOURNAL", "CONFERENCE", "WORKSHOP", "BOOK_CHAPTER", "PREPRINT", "THESIS", "OTHER"].map((value) => ({ value, label: value.replaceAll("_", " ") })) },
      { name: "status", label: "Status", type: "select", options: ["PUBLISHED", "ACCEPTED", "UNDER_REVIEW", "SUBMITTED", "PREPRINT", "IN_PREPARATION"].map((value) => ({ value, label: value.replaceAll("_", " ") })) },
      { name: "authors", label: "Authors", type: "list", wide: true }, { name: "authorPosition", label: "Your author position", type: "text" }, { name: "venue", label: "Journal / conference", type: "text" },
      { name: "publisher", label: "Publisher", type: "text" }, { name: "publicationDate", label: "Publication date", type: "date" }, { name: "doi", label: "DOI", type: "text" }, { name: "url", label: "Publication URL", type: "url" },
      { name: "volume", label: "Volume", type: "text" }, { name: "issue", label: "Issue", type: "text" }, { name: "pages", label: "Pages", type: "text" }, { name: "citationCount", label: "Citation count", type: "number" },
      { name: "abstract", label: "Abstract / summary", type: "textarea", wide: true }
    ]
  },
  {
    key: "academic-activities", label: "Academic activities", description: "Conferences, workshops, presentations and reviewing activities.", repeatable: true, itemLabel: "academic activity",
    fields: [
      { name: "eventName", label: "Event / conference", type: "text", required: true }, { name: "eventType", label: "Event type", type: "text" }, { name: "role", label: "Role", type: "text" },
      { name: "title", label: "Paper / presentation title", type: "text", wide: true }, { name: "location", label: "Location", type: "text" }, { name: "eventDate", label: "Date", type: "date" }, { name: "url", label: "URL", type: "url" }
    ]
  },
  {
    key: "certifications", label: "Certifications", description: "Professional certificates and completed courses.", repeatable: true, itemLabel: "certification",
    fields: [
      { name: "name", label: "Certificate / course", type: "text", required: true }, { name: "issuer", label: "Issuing organization", type: "text" }, { name: "issueDate", label: "Issue date", type: "date" }, { name: "expiryDate", label: "Expiry date", type: "date" },
      { name: "credentialId", label: "Credential ID", type: "text" }, { name: "credentialUrl", label: "Credential URL", type: "url" }, { name: "skills", label: "Skills", type: "list", wide: true }
    ]
  },
  {
    key: "awards", label: "Awards & honors", description: "Academic, research and competition recognition.", repeatable: true, itemLabel: "award",
    fields: [
      { name: "name", label: "Award", type: "text", required: true }, { name: "organization", label: "Organization", type: "text" }, { name: "awardDate", label: "Date", type: "date" },
      { name: "level", label: "Level", type: "select", options: ["UNIVERSITY", "NATIONAL", "INTERNATIONAL", "COMPETITION", "RESEARCH", "ACADEMIC", "OTHER"].map((value) => ({ value, label: value.replaceAll("_", " ") })) },
      { name: "description", label: "Description", type: "textarea", wide: true }
    ]
  },
  {
    key: "languages", label: "Languages", description: "Language proficiency for study and research matching.", repeatable: true, itemLabel: "language",
    fields: [
      { name: "language", label: "Language", type: "text", required: true }, { name: "proficiency", label: "Level", type: "select", options: ["NATIVE", "A1", "A2", "B1", "B2", "C1", "C2"].map((value) => ({ value, label: value })) }, { name: "note", label: "Note", type: "text", wide: true }
    ]
  },
  {
    key: "test-scores", label: "Language & entrance tests", description: "IELTS, TOEFL, GRE, GMAT, SAT, DET and other test results.", repeatable: true, itemLabel: "test score",
    fields: [
      { name: "testType", label: "Test", type: "text", required: true, placeholder: "IELTS" }, { name: "score", label: "Score", type: "text", required: true }, { name: "testDate", label: "Test date", type: "date" }, { name: "expiryDate", label: "Expiry date", type: "date" }, { name: "registrationId", label: "Registration / credential ID", type: "text", wide: true }
    ]
  },
  {
    key: "leadership", label: "Leadership & volunteering", description: "Leadership, volunteering and community contributions.", repeatable: true, itemLabel: "leadership record",
    fields: [
      { name: "role", label: "Role", type: "text", required: true }, { name: "organization", label: "Organization", type: "text", required: true }, { name: "startDate", label: "Start date", type: "date" }, { name: "endDate", label: "End date", type: "date" },
      { name: "currentlyActive", label: "Currently active", type: "checkbox", wide: true }, { name: "description", label: "Description", type: "textarea", wide: true }, { name: "achievements", label: "Achievements", type: "list", wide: true }
    ]
  },
  {
    key: "memberships", label: "Memberships", description: "Professional and academic memberships such as IEEE or ACM.", repeatable: true, itemLabel: "membership",
    fields: [
      { name: "organization", label: "Organization", type: "text", required: true }, { name: "membershipType", label: "Membership type", type: "text" }, { name: "membershipId", label: "Membership ID", type: "text" }, { name: "startDate", label: "Start date", type: "date" }, { name: "expiryDate", label: "Expiry date", type: "date" }
    ]
  },
  {
    key: "references", label: "References", description: "Private referee details. Contact consent is stored explicitly.", repeatable: true, itemLabel: "reference",
    fields: [
      { name: "name", label: "Name", type: "text", required: true }, { name: "position", label: "Position", type: "text" }, { name: "institution", label: "Institution", type: "text" }, { name: "relationship", label: "Relationship", type: "text" },
      { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone", type: "text" }, { name: "linkedin", label: "LinkedIn", type: "url" },
      { name: "canContact", label: "ResearVia may use this referee when I explicitly request outreach", type: "checkbox", wide: true }, { name: "recommendationLetterAvailable", label: "Recommendation letter available", type: "checkbox", wide: true }
    ]
  },
  {
    key: "opportunity-preferences", label: "Opportunity preferences", description: "Scholarship, degree, country and funding preferences used by recommendations.", repeatable: false, itemLabel: "opportunity preferences",
    fields: [
      { name: "lookingFor", label: "Looking for", type: "list", placeholder: "PhD, Research Assistant, Fellowship", wide: true }, { name: "preferredCountries", label: "Preferred countries", type: "list" }, { name: "preferredUniversities", label: "Preferred universities", type: "list" },
      { name: "preferredResearchAreas", label: "Preferred research areas", type: "list", wide: true }, { name: "preferredDegreeLevels", label: "Degree levels", type: "list", placeholder: "MASTERS, PHD" }, { name: "preferredWorkModes", label: "Work modes", type: "list" },
      { name: "fundingPreference", label: "Funding preference", type: "select", options: yesNoFunding }, { name: "targetIntake", label: "Target intake", type: "text", placeholder: "Fall 2027" }, { name: "expectedStartDate", label: "Expected start date", type: "date" },
      { name: "fullyFundedOnly", label: "Fully funded only", type: "checkbox" }, { name: "partialFundingAcceptable", label: "Partial funding acceptable", type: "checkbox" }, { name: "tuitionWaiverRequired", label: "Tuition waiver required", type: "checkbox" },
      { name: "stipendRequired", label: "Monthly stipend required", type: "checkbox" }, { name: "travelFundingRequired", label: "Travel funding required", type: "checkbox" }, { name: "accommodationFundingRequired", label: "Accommodation funding required", type: "checkbox" }
    ]
  },
  {
    key: "collaboration-preferences", label: "Research collaboration", description: "Tell Professor Finder whether you want supervisors, RA roles or collaborators.", repeatable: false, itemLabel: "collaboration preferences",
    fields: [
      { name: "openToCollaboration", label: "Open to research collaboration", type: "checkbox" }, { name: "lookingForCoauthors", label: "Looking for co-authors", type: "checkbox" }, { name: "lookingForSupervisor", label: "Looking for a supervisor", type: "checkbox" },
      { name: "lookingForResearchAssistantship", label: "Looking for research assistantship", type: "checkbox" }, { name: "preferredResearchAreas", label: "Preferred collaboration areas", type: "list", wide: true }, { name: "availableHoursPerWeek", label: "Available hours / week", type: "number" }
    ]
  },
  {
    key: "links", label: "Portfolio & links", description: "Professional, academic and research identities.", repeatable: true, itemLabel: "link",
    fields: [
      { name: "label", label: "Label", type: "text", required: true }, { name: "type", label: "Type", type: "select", options: ["WEBSITE", "PORTFOLIO", "GITHUB", "LINKEDIN", "GOOGLE_SCHOLAR", "ORCID", "RESEARCHGATE", "KAGGLE", "HUGGING_FACE", "OTHER"].map((value) => ({ value, label: value.replaceAll("_", " ") })) }, { name: "url", label: "URL", type: "url", required: true, wide: true }
    ]
  },
  {
    key: "summary", label: "CV summary & objectives", description: "Reusable professional, career and research summaries.", repeatable: false, itemLabel: "summary",
    fields: [
      { name: "professionalSummary", label: "Professional summary", type: "textarea", wide: true }, { name: "careerObjective", label: "Career objective", type: "textarea", wide: true }, { name: "researchObjective", label: "Research objective", type: "textarea", wide: true }
    ]
  }
];
