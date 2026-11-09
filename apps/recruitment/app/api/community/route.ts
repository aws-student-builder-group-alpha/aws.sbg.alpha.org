import { communitySession, checkRpc, CommunityError, deliverApplicantMessage, emailReady, emailSender } from '@/lib/server/community';
import { boundedBody, communityFailure, communityResponse, sameOrigin } from '@/lib/server/community-http';
import { record } from '@/lib/drafts';
import { isUuid } from '@/lib/staff';
export async function GET(request:Request){try{
 const session=await communitySession(),url=new URL(request.url),action=url.searchParams.get('action');
 const account=url.searchParams.get('accountId');if(account!==session.identity.id)throw new CommunityError('Return to the original signed-in account.',403);
 if(action==='notifications'){const result=await session.client.rpc('alpha_notifications');checkRpc(result.error);return communityResponse(result.data)}
 if(action==='member'){const result=await session.client.rpc('alpha_member',{p_id:url.searchParams.get('id')||undefined});checkRpc(result.error);return communityResponse(result.data)}
 if(action==='enrollment'){const id=url.searchParams.get('applicationId');if(id&&!isUuid(id))throw new CommunityError('Invalid application.');const result=await session.client.rpc('alpha_enrollment',{p_application:id||undefined});checkRpc(result.error);const data=record(result.data)?{...result.data}:null;if(data)delete data.path;return communityResponse(data)}
 if(action==='messages'){const id=url.searchParams.get('applicationId');if(!isUuid(id))throw new CommunityError('Invalid application.');const result=await session.client.rpc('alpha_messages',{p_application:id});checkRpc(result.error);return communityResponse({items:result.data,emailReady:emailReady(),sender:emailSender})}
 if(action==='audit'){const result=await session.client.rpc('alpha_security_log');checkRpc(result.error);return communityResponse(result.data)}
 throw new CommunityError('Unknown request.');
}catch(error){return communityFailure(error)}}
export async function POST(request:Request){try{
 sameOrigin(request);if(!request.headers.get('content-type')?.startsWith('application/json'))throw new CommunityError('Send a JSON request.');
 const input:unknown=JSON.parse(new TextDecoder().decode(await boundedBody(request,32768)));if(!record(input))throw new CommunityError('Invalid request.');
 const session=await communitySession();if(input.accountId!==session.identity.id)throw new CommunityError('Return to the original signed-in account.',403);
 if(input.action==='read'){if(!isUuid(input.id))throw new CommunityError('Invalid notification.');const r=await session.client.rpc('alpha_notifications',{p_read:input.id});checkRpc(r.error);return communityResponse(r.data)}
 if(input.action==='issueMember'){
  if(typeof input.email!=='string'||typeof input.name!=='string'||typeof input.position!=='string'||typeof input.joined!=='string'||typeof input.reason!=='string'||!['active','revoked'].includes(String(input.status)))throw new CommunityError('Check membership details.');
  const r=await session.client.rpc('alpha_issue_member',{p_email:input.email,p_name:input.name,p_position:input.position,p_joined:input.joined,p_reason:input.reason,p_status:String(input.status)});checkRpc(r.error);return communityResponse(r.data);
 }
 if(input.action==='updateMember'){if(typeof input.name!=='string')throw new CommunityError('Enter your name.');const r=await session.client.rpc('alpha_update_member',{p_name:input.name});checkRpc(r.error);return communityResponse(r.data)}
 if(input.action==='send'){
  if(!isUuid(input.id)||!isUuid(input.applicationId)||!Number.isSafeInteger(input.version)||typeof input.subject!=='string'||typeof input.body!=='string'||typeof input.kind!=='string'||input.calendly!==undefined&&typeof input.calendly!=='string')throw new CommunityError('Check the message.');
  return communityResponse(await deliverApplicantMessage(session,input));
 }
 throw new CommunityError('Unknown action.');
}catch(error){return communityFailure(error)}}
