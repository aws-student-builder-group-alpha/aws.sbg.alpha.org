'use client';
import { useEffect,useRef,useState } from 'react';
import { communityFetch,communityRead } from '@/recruitment/lib/community-client';
import { enrollmentMaxBytes,isEnrollment,uploadType,type Enrollment } from '@/recruitment/lib/community';
import { recruitmentPath } from '@/recruitment/lib/site-paths';
type EnrollmentUploadProps={accountId:string;disabled?:boolean;error?:string;onReady:(ready:boolean)=>void;practice?:boolean;readOnly?:boolean};
export function EnrollmentUpload(props:EnrollmentUploadProps){
 return <EnrollmentUploadSession key={props.accountId+':'+!!props.practice} {...props}/>;
}
function EnrollmentUploadSession({accountId,disabled=false,error,onReady,practice=false,readOnly=false}:EnrollmentUploadProps){
 const [document,setDocument]=useState<Enrollment|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 const operation=useRef(0),request=useRef<AbortController|null>(null),mounted=useRef(true),readyCallback=useRef(onReady);
 useEffect(()=>{readyCallback.current=onReady},[onReady]);
 useEffect(()=>{
  mounted.current=true;
  return()=>{mounted.current=false;request.current?.abort()};
 },[]);
 useEffect(()=>{
  if(practice)return;
  const id=++operation.current,controller=new AbortController();
  request.current?.abort();request.current=controller;
  const current=()=>mounted.current&&operation.current===id&&!controller.signal.aborted;
  readyCallback.current(false);
  void communityRead(accountId,'enrollment',{},controller.signal).then(data=>{
   if(!current())return;
   if(data!==null&&!isEnrollment(data))throw new Error('Enrollment document could not be verified.');
   setDocument(data);readyCallback.current(!!data);
  }).catch(error=>{if(current()){setMessage(error instanceof Error?error.message:'Could not load the saved document.');readyCallback.current(false)}});
  return()=>controller.abort();
 },[accountId,practice,retry]);
 async function upload(file:File){
  if(disabled||readOnly||busy)return;
  const id=++operation.current,controller=new AbortController();
  request.current?.abort();request.current=controller;
  const current=()=>mounted.current&&operation.current===id&&!controller.signal.aborted;
  const previous=document;
  setMessage('');setBusy(true);readyCallback.current(false);
  try{
   if(!file.size||file.size>enrollmentMaxBytes)throw new Error('Choose a PDF, JPG or PNG up to 3 MB.');
   const mime=uploadType(new Uint8Array(await file.arrayBuffer()));if(!file.size||file.size>enrollmentMaxBytes||!mime||mime!==file.type)throw new Error('Choose a PDF, JPG or PNG up to 3 MB.');
   if(!current())return;
   const form=new FormData();form.set('accountId',accountId);form.set('kind','enrollment');form.set('file',file);
   const data=practice?{id:'practice-enrollment',filename:file.name,size:file.size,createdAt:new Date().toISOString()}:await communityFetch('/recruitment/api/community/upload',{method:'POST',body:form,signal:controller.signal});
   if(!current())return;
   if(!isEnrollment(data))throw new Error('The upload could not be confirmed.');setDocument(data);readyCallback.current(true);
  }catch(error){if(current()){setMessage(error instanceof Error?error.message:'Upload could not be confirmed.');readyCallback.current(!!previous)}}finally{if(current())setBusy(false)}
 }
 return <section className="enrollment-upload field" aria-labelledby="enrollment-heading" aria-busy={busy}>
  <h3 id="enrollment-heading">Proof of enrollment <span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> (required)</span></h3>
  {!readOnly && <div id="enrollment-hint" className="enrollment-requirements">
    <dl>
      <div><dt>Document</dt><dd>Current registration form (COR) or official enrollment certificate</dd></div>
      <div><dt>Must show</dt><dd>Your name, school, and current academic term</dd></div>
      <div><dt>File limits</dt><dd>PDF, JPG, or PNG up to 3 MB</dd></div>
    </dl>
    <p className="field-hint">Only you and authorized recruitment staff can access your document. Staff use it to verify enrollment.</p>
  </div>}
  {readOnly && document && <p role="status">Uploaded: <strong>{document.filename}</strong></p>}
  {!readOnly && <>
    <label className="sr-only" htmlFor="proofOfEnrollment">{document ? 'Replace document' : 'Choose enrollment document'}</label>
    <div className="enrollment-file-control" data-disabled={disabled || busy}>
      <div className="enrollment-file-summary" id="enrollment-filename" role={document ? 'status' : undefined}>
        {document ? <><span>Uploaded</span><strong>{document.filename}</strong></> : <span>Choose your enrollment document</span>}
      </div>
      <span className="enrollment-file-action" aria-hidden="true">{busy ? 'Uploading…' : document ? 'Replace file' : 'Choose file'}</span>
      <input id="proofOfEnrollment" data-validation-field="proofOfEnrollment" type="file" accept="application/pdf,image/jpeg,image/png" required={!document} disabled={disabled||busy} aria-invalid={!!error&&!document||!!message} aria-describedby={['enrollment-hint','enrollment-filename',error&&!document?'proofOfEnrollment-error':'',message?'enrollment-message':''].filter(Boolean).join(' ')} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);event.target.value=''}}/>
    </div>
  </>}
  {document && !practice && <a className="enrollment-file-download" href={recruitmentPath('/recruitment/api/community/file?kind=enrollment&accountId='+accountId)} target="_blank" rel="noopener noreferrer">Download saved document</a>}
  {busy&&<p role="status">Uploading your document…</p>}
  {error&&!document&&<p className="field-error" id="proofOfEnrollment-error">{error}</p>}
  {message&&<p role="alert" id="enrollment-message">{message} {!practice&&<button type="button" className="text-button" disabled={busy} onClick={()=>{setMessage('');setRetry(value=>value+1)}}>Reload saved document</button>}</p>}
  {practice&&<p className="field-hint">Practice upload: this file stays in this preview and is not stored.</p>}
 </section>;
}
