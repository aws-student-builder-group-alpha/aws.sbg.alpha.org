'use client';
import { useEffect,useState } from 'react';
import { communityFetch,communityRead } from '@/lib/community-client';
import { enrollmentMaxBytes,isEnrollment,uploadType,type Enrollment } from '@/lib/community';
import { recruitmentPath } from '@/lib/site-paths';
export function EnrollmentUpload({accountId,disabled=false,error,onReady,practice=false,readOnly=false}:{accountId:string;disabled?:boolean;error?:string;onReady:(ready:boolean)=>void;practice?:boolean;readOnly?:boolean}){
 const [document,setDocument]=useState<Enrollment|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(practice)return;
  const controller=new AbortController();let active=true;
  void communityRead(accountId,'enrollment',{},controller.signal).then(data=>{if(!active)return;if(data!==null&&!isEnrollment(data))throw new Error('Enrollment document could not be verified.');setDocument(data);onReady(!!data)}).catch(error=>{if(active){setMessage(error instanceof Error?error.message:'Could not load the saved document.');onReady(false)}});
  return()=>{active=false;controller.abort()};
 },[accountId,practice,onReady,retry]);
 async function upload(file:File){
  setMessage('');setBusy(true);onReady(false);
  try{
   if(!file.size||file.size>enrollmentMaxBytes)throw new Error('Choose a PDF, JPG or PNG up to 3 MB.');
   const mime=uploadType(new Uint8Array(await file.arrayBuffer()));if(!file.size||file.size>enrollmentMaxBytes||!mime||mime!==file.type)throw new Error('Choose a PDF, JPG or PNG up to 3 MB.');
   const form=new FormData();form.set('accountId',accountId);form.set('kind','enrollment');form.set('file',file);
   const data=practice?{id:'practice-enrollment',filename:file.name,size:file.size,createdAt:new Date().toISOString()}:await communityFetch('/api/community/upload',{method:'POST',body:form});
   if(!isEnrollment(data))throw new Error('The upload could not be confirmed.');setDocument(data);onReady(true);
  }catch(error){setMessage(error instanceof Error?error.message:'Upload could not be confirmed.');onReady(!!document)}finally{setBusy(false)}
 }
 return <section className="enrollment-upload field" aria-labelledby="enrollment-heading" aria-busy={busy}>
  <h3 id="enrollment-heading">Proof of enrollment <span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> (required)</span></h3>
  <p id="enrollment-hint" className="field-hint">Upload your current registration form (COR) or official enrollment certificate showing your name, school and current academic term. PDF, JPG or PNG, up to 3 MB. Authorized recruitment staff will review it to verify enrollment. Only you and authorized recruitment staff can access this document.</p>
  {document&&<p role="status">Uploaded: <strong>{document.filename}</strong>{!practice&&<> · <a href={recruitmentPath('/api/community/file?kind=enrollment&accountId='+accountId)} target="_blank" rel="noopener noreferrer">Download saved document</a></>}</p>}
  {!readOnly&&<><label htmlFor="proofOfEnrollment">{document?'Replace document':'Choose enrollment document'}</label>
  <input id="proofOfEnrollment" data-validation-field="proofOfEnrollment" type="file" accept="application/pdf,image/jpeg,image/png" required={!document} disabled={disabled||busy} aria-invalid={!!error&&!document||!!message} aria-describedby={['enrollment-hint',error&&!document?'proofOfEnrollment-error':'',message?'enrollment-message':''].filter(Boolean).join(' ')} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);event.target.value=''}}/></>}
  {busy&&<p role="status">Uploading your document…</p>}
  {error&&!document&&<p className="field-error" id="proofOfEnrollment-error">{error}</p>}
  {message&&<p role="alert" id="enrollment-message">{message} {!practice&&<button type="button" className="text-button" onClick={()=>setRetry(value=>value+1)}>Reload saved document</button>}</p>}
  {practice&&<p className="field-hint">Practice upload: this file stays in this preview and is not stored.</p>}
 </section>;
}
