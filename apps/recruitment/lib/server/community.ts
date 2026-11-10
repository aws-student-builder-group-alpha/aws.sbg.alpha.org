import "server-only";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import type { Database } from "@/lib/supabase/schema";
import { record } from "@/lib/drafts";
import { accountSession } from "./session";
import { getAppOrigin } from "@/lib/supabase/config";
import { recruitmentPath } from "@/lib/site-paths";

export const emailSender = "awslc.alpha@gmail.com";
function emailSecretKey() { return process.env.ALPHA_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; }
export function emailReady() { return !!process.env.ALPHA_GMAIL_APP_PASSWORD && !!emailSecretKey(); }
function mailTransport() {
  return nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,
    auth:{user:emailSender,pass:process.env.ALPHA_GMAIL_APP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
    disableFileAccess:true,disableUrlAccess:true});
}
export class CommunityError extends Error {
  status:number;
  constructor(message: string, status=422) { super(message); this.status=status; }
}
export async function communitySession() {
  const session=await accountSession();
  if (session.kind==='anonymous') throw new CommunityError('Sign in with Google to continue.',401);
  if (session.kind!=='applicant' && session.kind!=='staff') throw new CommunityError('Your account could not be verified. Retry shortly.',503);
  if (session.kind==='staff' && (session.membership.status!=='active'||session.needsMfa)) throw new CommunityError('Complete staff verification before continuing.',403);
  return session;
}
export function checkRpc(error: {code?: string; message?: string} | null) {
  if (!error) return;
  const status=error.code==='42501'?403:error.code==='P0002'?404:error.code==='PT409'?409:error.code==='PT429'?429:['22023','23514','PT422'].includes(error.code||'')?422:503;
  throw new CommunityError(status===503?'This service is unavailable. Your changes have not been confirmed.':error.message||'Check your access and request.',status);
}
export async function deliverApplicantMessage(session: Awaited<ReturnType<typeof communitySession>>, input: Record<string,unknown>) {
  if (session.kind!=='staff') throw new CommunityError('Staff access required.',403);
  if (!emailReady()) throw new CommunityError('Email is not connected yet. The Alpha mailbox needs its server-side sending credentials.',503);
  const {data,error}=await session.client.rpc('alpha_prepare_message',{
    p_id:String(input.id),p_application:String(input.applicationId),p_version:Number(input.version),p_kind:String(input.kind),
    p_subject:String(input.subject),p_body:String(input.body),p_calendly:typeof input.calendly==='string'&&input.calendly?input.calendly:undefined,
  });
  checkRpc(error);
  if (!record(data)||typeof data.id!=='string'||typeof data.recipient!=='string'||typeof data.subject!=='string'||typeof data.body!=='string') throw new CommunityError('Message could not be confirmed.',503);
  const claim=await session.client.rpc('alpha_claim_message',{p_id:data.id});checkRpc(claim.error);
  if (!claim.data) return {id:data.id,state:data.state==='sent'?'sent':'unconfirmed',replayed:true};
  const transport=mailTransport();
  let state:'sent'|'failed'|'uncertain'='uncertain';
  try {
    const text=data.body+(typeof data.calendly_url==='string'?'\n\nChoose an interview schedule: '+data.calendly_url:'')+'\n\nAWS Student Builder Group – Alpha\nReply to this email if you need help.';
    const receipt=await transport.sendMail({from:{name:'AWS SBG – Alpha',address:emailSender},to:data.recipient,subject:data.subject,text,
      messageId:'<alpha-'+data.id+'@gmail.com>',disableFileAccess:true,disableUrlAccess:true});
    state=receipt.accepted.map(String).includes(data.recipient)?'sent':'failed';
  } catch { state='uncertain'; } finally { transport.close(); }
  const config=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!config) throw new CommunityError('Delivery acknowledgement could not be recorded. Check history before sending another message.',503);
  const server=createClient<Database>(config,emailSecretKey()!,{auth:{persistSession:false,autoRefreshToken:false}});
  const finished=await server.rpc('alpha_finish_message',{p_id:data.id,p_state:state});
  if (finished.error) throw new CommunityError('Delivery acknowledgement could not be recorded. Check history before sending another message.',503);
  return {id:data.id,state,replayed:false};
}

export async function deliverMemberInvitation(session: Awaited<ReturnType<typeof communitySession>>, id: string) {
  if(session.kind!=='staff')throw new CommunityError('Administrator access required.',403);
  if(!emailReady())throw new CommunityError('Invitation saved, but email is not connected on this deployment. Share the Membership ID link instead.',503);
  const result=await session.client.rpc('alpha_claim_member_invitation',{p_id:id});checkRpc(result.error);
  if(result.data===null)return {state:'already_claimed'};
  const invitation=result.data;
  if(!record(invitation)||typeof invitation.email!=='string'||typeof invitation.full_name!=='string'||typeof invitation.position!=='string')throw new CommunityError('Invitation could not be confirmed.',503);
  const transport=mailTransport();let state:'sent'|'failed'|'uncertain'='uncertain';
  try {
    const receipt=await transport.sendMail({from:{name:'AWS SBG – Alpha',address:emailSender},to:invitation.email,
      subject:'Accept your Alpha membership',
      text:`Hello ${invitation.full_name},\n\nAlpha has invited you as ${invitation.position}.\n\nSign in with this invited Google account at ${getAppOrigin()+recruitmentPath('/membership')} and choose Accept membership. You do not need to fill out a recruitment application. After accepting, add your portrait and download your Alpha membership ID.\n\nAWS Student Builder Group – Alpha\nReply to this email if you need help.`,
      messageId:'<alpha-member-'+id+'@gmail.com>',disableFileAccess:true,disableUrlAccess:true});
    state=receipt.accepted.map(String).includes(invitation.email)?'sent':'failed';
  } catch { state='uncertain'; } finally { transport.close(); }
  const config=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!config)throw new CommunityError('Delivery could not be recorded. Check invitation history before sending again.',503);
  const server=createClient<Database>(config,emailSecretKey()!,{auth:{persistSession:false,autoRefreshToken:false}});
  const finished=await server.rpc('alpha_finish_member_invitation',{p_id:id,p_state:state});checkRpc(finished.error);
  return {state};
}
