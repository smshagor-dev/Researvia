import { prepareNotificationDatabase } from "@/server/db/notification-indexes";
import { NotificationPreference } from "@/server/models/NotificationPreference";

export type NotificationPreferencesDto = {
  professorMatchWeb:boolean; professorMatchPush:boolean; minimumProfessorMatchScore:number;
  scholarshipMatchWeb:boolean; scholarshipMatchPush:boolean; minimumScholarshipMatchScore:number;
  opportunityMatchWeb:boolean; opportunityMatchPush:boolean; minimumOpportunityMatchScore:number;
  labMatchWeb:boolean; labMatchPush:boolean; minimumLabMatchScore:number;
  programMatchWeb:boolean; programMatchPush:boolean; minimumProgramMatchScore:number;
};
const defaults:NotificationPreferencesDto={professorMatchWeb:true,professorMatchPush:true,minimumProfessorMatchScore:55,scholarshipMatchWeb:true,scholarshipMatchPush:true,minimumScholarshipMatchScore:60,opportunityMatchWeb:true,opportunityMatchPush:true,minimumOpportunityMatchScore:60,labMatchWeb:true,labMatchPush:true,minimumLabMatchScore:60,programMatchWeb:true,programMatchPush:true,minimumProgramMatchScore:60};
function dto(value:Partial<NotificationPreferencesDto>|null|undefined):NotificationPreferencesDto { return {...defaults,...Object.fromEntries(Object.entries(value ?? {}).filter(([,v])=>v!==undefined))} as NotificationPreferencesDto; }
export async function getNotificationPreferences(userId:string):Promise<NotificationPreferencesDto>{await prepareNotificationDatabase();return dto(await NotificationPreference.findOne({userId}).lean() as Partial<NotificationPreferencesDto>|null);}
export async function updateNotificationPreferences(userId:string,input:Partial<NotificationPreferencesDto>):Promise<NotificationPreferencesDto>{await prepareNotificationDatabase();const value=await NotificationPreference.findOneAndUpdate({userId},{$set:input,$setOnInsert:{userId}},{upsert:true,returnDocument:"after",runValidators:true,setDefaultsOnInsert:true}).lean();return dto(value as Partial<NotificationPreferencesDto>|null);}
