import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { getServerEnv } from "@/config/env";
import { AppError } from "@/server/errors/AppError";
import { claimNextJob, completeJob, enqueueJob, failJob } from "@/server/jobs/job.service";
import { processJob } from "@/server/jobs/processors";
export const runtime="nodejs";
function hourlyKey(date=new Date()){return date.toISOString().slice(0,13)}
function dailyKey(date=new Date()){return date.toISOString().slice(0,10)}
function sixHourKey(date=new Date()){const day=date.toISOString().slice(0,10);return `${day}:${Math.floor(date.getUTCHours()/6)}`}
export async function POST(request:Request){const requestId=getRequestId(request);try{const secret=getServerEnv().WORKER_SECRET;if(!secret)throw new AppError("WORKER_NOT_CONFIGURED",503,"Background worker is not configured.");if(request.headers.get("authorization")!==`Bearer ${secret}`)throw new AppError("UNAUTHORIZED",401,"Invalid worker credentials.");const workerId=request.headers.get("x-worker-id")?.slice(0,120)||"worker";await Promise.all([
enqueueJob({type:"EVALUATE_WATCHLISTS",idempotencyKey:`watchlists:${hourlyKey()}`,maxAttempts:3}),
enqueueJob({type:"SCAN_ACADEMIC_REMINDERS",idempotencyKey:`academic-reminders:${hourlyKey()}`,maxAttempts:3}),
enqueueJob({type:"SCAN_SYSTEM_IMAP",payload:{reason:"periodic-reconciliation"},idempotencyKey:`system-imap-scan:${hourlyKey()}`,maxAttempts:3}),
enqueueJob({type:"SCAN_SYSTEM_AUTO_REPLIES",idempotencyKey:`system-auto-reply-scan:${hourlyKey()}`,maxAttempts:3}),
enqueueJob({type:"SCAN_PROFESSOR_CONTACT_ENRICHMENT",payload:{reason:"periodic-reconciliation"},idempotencyKey:`professor-contact-reconciliation:${dailyKey()}`,maxAttempts:3}),
enqueueJob({type:"SCAN_PROFESSOR_MATCHES",payload:{reason:"periodic-reconciliation"},idempotencyKey:`professor-match-reconciliation:${sixHourKey()}`,maxAttempts:3}),
enqueueJob({type:"SCAN_ACADEMIC_MATCHES",payload:{reason:"periodic-reconciliation"},idempotencyKey:`academic-match-reconciliation:${sixHourKey()}`,maxAttempts:3}),
enqueueJob({type:"SYNC_ACADEMIC_FEEDS",idempotencyKey:`academic-feed-sync:${sixHourKey()}`,maxAttempts:3})]);
let processed=0;for(let i=0;i<15;i+=1){const job=await claimNextJob(workerId);if(!job)break;try{await processJob(job.type,(job.payload??{}) as Record<string,unknown>);await completeJob(job._id.toString());}catch(error){await failJob(job._id.toString(),job.attempts,job.maxAttempts,error);}processed+=1;}return apiSuccess({processed});}catch(error){return handleApiError(error,requestId)}}
