"use client";
import type { ReactNode } from "react";
type Envelope<T>={data?:T;error?:{message?:string}};
export async function api<T>(url:string,init?:RequestInit):Promise<T>{const response=await fetch(url,{...init,cache:"no-store"});const body=await response.json() as Envelope<T>;if(!response.ok)throw new Error(body.error?.message||"Request failed.");if(!body.data)throw new Error("Unexpected server response.");return body.data;}
export const inputClass="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500";
export const buttonClass="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
export const secondaryButton="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
export function Header({title,description,action}:{title:string;description:string;action?:ReactNode}){return <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-semibold text-slate-950">{title}</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</div>}
export function Notice({error,success}:{error:string;success?:string}){return <>{error?<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>:null}{success?<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>:null}</>}
export function Card({children,className=""}:{children:ReactNode;className?:string}){return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>}
export function dt(value:string|null|undefined){return value?new Date(value).toLocaleString():"—";}
export function localInput(value:string|null|undefined){if(!value)return "";const d=new Date(value);const shifted=new Date(d.getTime()-d.getTimezoneOffset()*60000);return shifted.toISOString().slice(0,16);}
