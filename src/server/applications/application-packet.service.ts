import mongoose from "mongoose";
import type { ApplicationPacketInput } from "@/schemas/application-packet";
import { prepareApplicationDatabase } from "@/server/db/application-indexes";
import { AppError } from "@/server/errors/AppError";
import { Application } from "@/server/models/Application";
import { ApplicationPacket } from "@/server/models/ApplicationPacket";
import { RecommendationRequest } from "@/server/models/RecommendationRequest";
import { StudentDocument } from "@/server/models/StudentDocument";

function assertId(id:string){if(!mongoose.isValidObjectId(id))throw new AppError("APPLICATION_NOT_FOUND",404,"Application not found.");}

export async function getApplicationReadiness(userId:string,applicationId:string){
  assertId(applicationId); await prepareApplicationDatabase();
  const application=await Application.findOne({_id:applicationId,userId}).select("title deadline").lean();
  if(!application)throw new AppError("APPLICATION_NOT_FOUND",404,"Application not found.");
  const packet=await ApplicationPacket.findOne({userId,applicationId}).lean();
  const requiredDocumentKinds=(packet?.requiredDocumentKinds?.length?packet.requiredDocumentKinds:["CV"]).map(String);
  const recommendationsRequired=Number(packet?.recommendationsRequired??0);
  const [documents,recommendations]=await Promise.all([
    StudentDocument.find({userId,kind:{$in:requiredDocumentKinds}}).select("kind originalName createdAt").sort({createdAt:-1}).lean(),
    RecommendationRequest.find({userId,status:"RECEIVED",$or:[{studentReferenceId:application._id},{studentReferenceId:null,applicationName:application.title}]}).select("refereeName receivedAt").sort({receivedAt:-1}).lean()
  ]);
  const latestByKind=new Map<string,{id:string;name:string}>();
  for(const doc of documents){const kind=String(doc.kind);if(!latestByKind.has(kind))latestByKind.set(kind,{id:String(doc._id),name:String(doc.originalName)});}
  const checklist:Array<{id:string;category:"DETAIL"|"DOCUMENT"|"RECOMMENDATION";label:string;complete:boolean;href:string}>=[
    {id:"deadline",category:"DETAIL",label:"Application deadline recorded",complete:Boolean(application.deadline),href:`/dashboard/applications/${applicationId}`},
    ...requiredDocumentKinds.map(kind=>({id:`document:${kind}`,category:"DOCUMENT" as const,label:`${kind.replaceAll("_"," ")} uploaded`,complete:latestByKind.has(kind),href:"/dashboard/documents"})),
    ...Array.from({length:recommendationsRequired},(_,index)=>({id:`recommendation:${index+1}`,category:"RECOMMENDATION" as const,label:`Recommendation ${index+1} received`,complete:index<recommendations.length,href:"/dashboard/recommendation-letters"}))
  ];
  const completeCount=checklist.filter(item=>item.complete).length; const totalCount=checklist.length; const score=totalCount?Math.round((completeCount/totalCount)*100):100;
  return {score,ready:completeCount===totalCount,completeCount,totalCount,missing:checklist.filter(item=>!item.complete).map(item=>item.label),checklist,requiredDocumentKinds,recommendationsRequired,receivedRecommendations:recommendations.length,documents:Object.fromEntries(latestByKind)};
}

export async function updateApplicationPacket(userId:string,applicationId:string,input:ApplicationPacketInput){
  assertId(applicationId); await prepareApplicationDatabase();
  const exists=await Application.exists({_id:applicationId,userId}); if(!exists)throw new AppError("APPLICATION_NOT_FOUND",404,"Application not found.");
  await ApplicationPacket.findOneAndUpdate({userId,applicationId},{$set:{requiredDocumentKinds:[...new Set(input.requiredDocumentKinds)],recommendationsRequired:input.recommendationsRequired},$setOnInsert:{userId,applicationId}},{upsert:true,returnDocument:"after",runValidators:true});
  return getApplicationReadiness(userId,applicationId);
}
