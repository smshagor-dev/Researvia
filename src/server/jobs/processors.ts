import { processOutreachFollowUp, processOutreachRecipient, reconcileOutreachReplies } from "@/server/outreach/outreach.service";
import { syncEmailMetadata } from "@/server/email/email-account.service";
import { enqueueEnabledSystemImapSyncs, syncSystemImap } from "@/server/email/imap-sync.service";
import { processScheduledSystemMail } from "@/server/email/scheduled-mail.service";
import { processSystemAutoReply, scanSystemAutoReplyCandidates } from "@/server/email/auto-reply.service";
import { processImportJob } from "@/server/imports/import.service";
import { deleteGridFsFiles } from "@/server/documents/document.service";
import { evaluateEnabledWatchlists } from "@/server/watchlists/watchlist-evaluator.service";
import { deliverNotificationPush } from "@/server/notifications/push.service";
import { scanAcademicReminders } from "@/server/productivity/reminder.service";
import { enrichProfessorContact, enrichUniversityMetadata, scanProfessorContactEnrichment } from "@/server/enrichment/professor-contact-enrichment.service";
import { queueAcademicEnrichmentForImportJob } from "@/server/enrichment/import-enrichment.service";
import { enqueueProfessorMatchEvaluationForAllStudents, evaluateProfessorMatchesForUser } from "@/server/profile/professor-match-notification.service";
import { enqueueAcademicMatchEvaluationForAllStudents, evaluateAcademicMatchesForUser } from "@/server/matching/academic-match.service";
import { syncActiveAcademicFeeds } from "@/server/feeds/feed-sync.service";

export async function processJob(type:string,payload:Record<string,unknown>){
if(type==="SEND_OUTREACH_RECIPIENT"){const recipientId=String(payload.recipientId??"");if(!recipientId)throw new Error("Missing recipientId.");await processOutreachRecipient(recipientId);return;}
if(type==="SEND_OUTREACH_FOLLOWUP"){const recipientId=String(payload.recipientId??"");if(!recipientId)throw new Error("Missing recipientId.");await processOutreachFollowUp(recipientId);return;}
if(type==="SYNC_EMAIL_ACCOUNT"){const userId=String(payload.userId??"");const accountId=String(payload.accountId??"");if(!userId||!accountId)throw new Error("Missing email sync identifiers.");await syncEmailMetadata(userId,accountId);await reconcileOutreachReplies(userId);return;}
if(type==="SYNC_SYSTEM_IMAP"){const userId=String(payload.userId??"");if(!userId)throw new Error("Missing userId for IMAP sync.");await syncSystemImap(userId);await reconcileOutreachReplies(userId);return;}
if(type==="SCAN_SYSTEM_IMAP"){await enqueueEnabledSystemImapSyncs(String(payload.reason??"periodic-reconciliation"));return;}
if(type==="SEND_SCHEDULED_SYSTEM_MAIL"){const userId=String(payload.userId??"");const messageId=String(payload.messageId??"");if(!userId||!messageId)throw new Error("Missing scheduled mail identifiers.");await processScheduledSystemMail(userId,messageId,payload.replyToMessageId?String(payload.replyToMessageId):null);return;}
if(type==="SCAN_SYSTEM_AUTO_REPLIES"){await scanSystemAutoReplyCandidates();return;}
if(type==="SEND_SYSTEM_AUTO_REPLY"){const receiptId=String(payload.receiptId??"");if(!receiptId)throw new Error("Missing auto-reply receiptId.");await processSystemAutoReply(receiptId);return;}
if(type==="PROCESS_IMPORT"){const importJobId=String(payload.importJobId??"");if(!importJobId)throw new Error("Missing importJobId.");await processImportJob(importJobId);await queueAcademicEnrichmentForImportJob(importJobId);return;}
if(type==="ENRICH_PROFESSOR_CONTACT"){const professorId=String(payload.professorId??"");if(!professorId)throw new Error("Missing professorId.");await enrichProfessorContact(professorId);return;}
if(type==="ENRICH_UNIVERSITY_METADATA"){const universityId=String(payload.universityId??"");if(!universityId)throw new Error("Missing universityId.");await enrichUniversityMetadata(universityId);return;}
if(type==="SCAN_PROFESSOR_CONTACT_ENRICHMENT"){await scanProfessorContactEnrichment(String(payload.reason??"periodic-reconciliation"));return;}
if(type==="DELETE_GRIDFS_FILES"){const value=payload.fileIds;if(!Array.isArray(value))throw new Error("Missing fileIds.");await deleteGridFsFiles(value.map(String));return;}
if(type==="EVALUATE_WATCHLISTS"){await evaluateEnabledWatchlists();return;}
if(type==="SCAN_ACADEMIC_REMINDERS"){await scanAcademicReminders();return;}
if(type==="EVALUATE_PROFESSOR_MATCHES"){const userId=String(payload.userId??"");if(!userId)throw new Error("Missing userId for professor matching.");await evaluateProfessorMatchesForUser(userId);return;}
if(type==="SCAN_PROFESSOR_MATCHES"){await enqueueProfessorMatchEvaluationForAllStudents(String(payload.reason??"professor-catalog-change"));return;}
if(type==="EVALUATE_ACADEMIC_MATCHES"){const userId=String(payload.userId??"");if(!userId)throw new Error("Missing userId for academic matching.");await evaluateAcademicMatchesForUser(userId);return;}
if(type==="SCAN_ACADEMIC_MATCHES"){await enqueueAcademicMatchEvaluationForAllStudents(String(payload.reason??"academic-catalog-change"));return;}
if(type==="SYNC_ACADEMIC_FEEDS"){await syncActiveAcademicFeeds();return;}
if(type==="SEND_PUSH_NOTIFICATION"){const notificationId=String(payload.notificationId??"");if(!notificationId)throw new Error("Missing notificationId for push delivery.");await deliverNotificationPush(notificationId);return;}
throw new Error(`Unsupported job type: ${type}`);
}
