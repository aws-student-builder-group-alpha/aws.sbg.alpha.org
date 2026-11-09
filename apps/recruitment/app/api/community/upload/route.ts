import { communitySession,checkRpc,CommunityError } from '@/lib/server/community';
import { boundedBody,communityFailure,communityResponse,sameOrigin } from '@/lib/server/community-http';
import { enrollmentMaxBytes,photoMaxBytes,uploadType } from '@/lib/community';
import { record } from '@/lib/drafts';
import sharp from 'sharp';
export async function POST(request:Request){try{
 sameOrigin(request);const session=await communitySession();
 const type=request.headers.get('content-type');if(!type?.startsWith('multipart/form-data;'))throw new CommunityError('Choose a document to upload.');
 const bytes=await boundedBody(request,enrollmentMaxBytes+65536);
 const form=await new Response(new Uint8Array(bytes),{headers:{'content-type':type}}).formData();
 if(form.get('accountId')!==session.identity.id)throw new CommunityError('Return to the original signed-in account.',403);
 const kind=form.get('kind'),file=form.get('file');if(!(file instanceof File)||!['enrollment','photo'].includes(String(kind)))throw new CommunityError('Choose a file.');
 if(kind==='enrollment'&&session.kind!=='applicant')throw new CommunityError('Applicant access required.',403);
 let content=new Uint8Array(await file.arrayBuffer()),mime=uploadType(content);const limit=kind==='photo'?photoMaxBytes:enrollmentMaxBytes;
 if(!file.size||file.size>limit||!mime||mime!==file.type||kind==='photo'&&mime==='application/pdf')throw new CommunityError(kind==='photo'?'Choose a JPG or PNG image up to 2 MB.':'Choose a PDF, JPG or PNG up to 3 MB.');
 if(kind==='photo'){try{content=new Uint8Array(await sharp(content,{limitInputPixels:16000000}).rotate().resize(512,640,{fit:'cover'}).png().toBuffer());mime='image/png'}catch{throw new CommunityError('This image could not be processed. Choose a JPG or PNG portrait with fewer than 16 million pixels.')}}
 let previous:string|null=null;
 if(kind==='enrollment'){const old=await session.client.rpc('alpha_enrollment');checkRpc(old.error);if(record(old.data)&&typeof old.data.path==='string')previous=old.data.path}
 else {const old=await session.client.rpc('alpha_member');checkRpc(old.error);if(!record(old.data))throw new CommunityError('An active membership is required before uploading a photo.',403);if(typeof old.data.photo_path==='string')previous=old.data.photo_path}
 const bucket=kind==='photo'?'alpha-member-photos':'alpha-enrollment';
 const path=session.identity.id+'/'+crypto.randomUUID()+({ 'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png' }[mime]);
 const uploaded=await session.client.storage.from(bucket).upload(path,content,{contentType:mime,upsert:false,cacheControl:'0'});
 if(uploaded.error)throw new CommunityError('The upload was not confirmed. Check the file and retry.',503);
 const result=kind==='enrollment'
  ?await session.client.rpc('alpha_save_enrollment',{p_path:path,p_filename:file.name.replace(/[\\/\x00-\x1f\x7f]/g,'_').slice(0,160)||'Enrollment document',p_type:mime,p_size:file.size})
  :await session.client.rpc('alpha_update_member',{p_name:String(form.get('name')||'').trim(),p_photo:path});
 if(result.error){await session.client.storage.from(bucket).remove([path]);checkRpc(result.error)}
 if(previous&&previous!==path)await session.client.storage.from(bucket).remove([previous]);
 return communityResponse(result.data);
}catch(error){return communityFailure(error)}}
