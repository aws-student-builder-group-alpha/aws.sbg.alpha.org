import { communitySession,checkRpc,CommunityError } from '@/lib/server/community';
import { communityFailure,privateHeaders } from '@/lib/server/community-http';
import { record } from '@/lib/drafts';
import { isUuid } from '@/lib/staff';
export async function GET(request:Request){try{
 const session=await communitySession(),url=new URL(request.url),kind=url.searchParams.get('kind');
 if(url.searchParams.get('accountId')!==session.identity.id)throw new CommunityError('Return to the original signed-in account.',403);
 let path='',filename='',bucket='';
 if(kind==='enrollment'){
  const id=url.searchParams.get('applicationId');if(id&&!isUuid(id))throw new CommunityError('Invalid application.');
  const result=await session.client.rpc('alpha_enrollment',{p_application:id||undefined});checkRpc(result.error);
  if(record(result.data)&&typeof result.data.path==='string'&&typeof result.data.filename==='string'){path=result.data.path;filename=result.data.filename;bucket='alpha-enrollment'}
 }else if(kind==='photo'){
  const result=await session.client.rpc('alpha_member');checkRpc(result.error);
  if(record(result.data)&&typeof result.data.photo_path==='string'){path=result.data.photo_path;filename='member-photo';bucket='alpha-member-photos'}
 }
 if(!path)throw new CommunityError('This file is unavailable.',404);
 const result=await session.client.storage.from(bucket).download(path);if(result.error||!result.data)throw new CommunityError('This file could not be loaded. Retry shortly.',503);
 return new Response(result.data,{headers:{...privateHeaders,'Content-Type':result.data.type||'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(filename),'Content-Security-Policy':"sandbox; default-src 'none'"}});
}catch(error){return communityFailure(error)}}
