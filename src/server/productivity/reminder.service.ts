import { connectDatabase } from "@/server/db/mongoose";
import { enqueueJob } from "@/server/jobs/job.service";
import { CalendarEvent } from "@/server/models/CalendarEvent";
import { PlannerTask } from "@/server/models/PlannerTask";
import { RecommendationRequest } from "@/server/models/RecommendationRequest";
import { notifyUser } from "@/server/notifications/notification.service";

async function createReminder(input:{userId:string;type:string;title:string;message:string;href:string;dedupeKey:string;metadata:Record<string,unknown>}){
  const notification=await notifyUser({...input,webVisible:true});
  await enqueueJob({type:"SEND_PUSH_NOTIFICATION",payload:{notificationId:notification._id.toString()},idempotencyKey:`push:${notification._id.toString()}`,maxAttempts:4});
}
export async function scanAcademicReminders(now=new Date()){
  await connectDatabase();
  const future=new Date(now.getTime()+366*24*60*60*1000);
  const [events,tasks,requests]=await Promise.all([
    CalendarEvent.find({startsAt:{$gt:now,$lte:future}}).select("userId title type startsAt reminderMinutes").limit(5000).lean(),
    PlannerTask.find({status:{$nin:["DONE","CANCELLED"]},reminderAt:{$ne:null,$lte:now}}).select("userId title dueAt reminderAt priority").limit(2000).lean(),
    RecommendationRequest.find({status:{$in:["DRAFT","REQUESTED","CONFIRMED"]},reminderAt:{$ne:null,$lte:now}}).select("userId refereeName applicationName deadline reminderAt status").limit(2000).lean()
  ]);
  let delivered=0;
  for(const event of events){for(const minutes of event.reminderMinutes??[]){const due=new Date(event.startsAt).getTime()-Number(minutes)*60000;if(due>now.getTime()||due<now.getTime()-65*60000)continue;await createReminder({userId:event.userId.toString(),type:"ACADEMIC_REMINDER",title:event.type==="DEADLINE"?"Deadline reminder":"Calendar reminder",message:`${event.title} · ${new Date(event.startsAt).toLocaleString()}`,href:"/dashboard/calendar",dedupeKey:`calendar:${event._id}:${minutes}:${new Date(event.startsAt).toISOString()}`,metadata:{sourceType:"CALENDAR",sourceId:event._id.toString(),startsAt:event.startsAt,minutesBefore:minutes}});delivered++;}}
  for(const task of tasks){await createReminder({userId:task.userId.toString(),type:"ACADEMIC_REMINDER",title:"Task reminder",message:`${task.title}${task.dueAt?` · due ${new Date(task.dueAt).toLocaleString()}`:""}`,href:"/dashboard/tasks",dedupeKey:`task:${task._id}:${new Date(task.reminderAt as Date).toISOString()}`,metadata:{sourceType:"TASK",sourceId:task._id.toString(),dueAt:task.dueAt}});delivered++;}
  for(const request of requests){await createReminder({userId:request.userId.toString(),type:"ACADEMIC_REMINDER",title:"Recommendation letter follow-up",message:`Follow up with ${request.refereeName} for ${request.applicationName}${request.deadline?` · deadline ${new Date(request.deadline).toLocaleDateString()}`:""}.`,href:"/dashboard/recommendation-letters",dedupeKey:`recommendation:${request._id}:${new Date(request.reminderAt as Date).toISOString()}`,metadata:{sourceType:"RECOMMENDATION",sourceId:request._id.toString(),deadline:request.deadline}});delivered++;}
  return {delivered};
}
