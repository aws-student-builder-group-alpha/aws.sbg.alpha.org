'use client';
import { useEffect,useRef,useState } from 'react';
import { CommunityClientError,communityCommand,communityRead } from '@/lib/community-client';
import { isCalendly,isMessage,type Message } from '@/lib/community';
import { record } from '@/lib/drafts';
import { recruitmentPath } from '@/lib/site-paths';
import type { SubmittedApplication } from '@/lib/applications';
import { MemberAdministration } from './member-administration';
import { getOpportunity,opportunityLabel } from '@/lib/catalog';
export function ApplicantOutreach({accountId,application,administrator}:{accountId:string;application:SubmittedApplication;administrator:boolean}){
 const [messages,setMessages]=useState<Message[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 const initialKind=application.status==='Accepted'?'accepted':application.status==='Not Selected'?'rejected':application.status==='Under Review'?'interview':'update';
 const [kind,setKind]=useState(initialKind),[subject,setSubject]=useState('Your application · AWS SBG Alpha'),[body,setBody]=useState(`Hi ${application.data.profile.fullName},\n\n${initialKind==='accepted'?'Congratulations! Your application has been accepted. Welcome to Alpha.':initialKind==='rejected'?'Thank you for applying. We are unable to offer you this position in this recruitment cycle. We appreciate your effort and encourage you to stay connected.':initialKind==='interview'?'We would like to invite you to an interview. Please choose a suitable time using the scheduling link below.':'Here is an update about your application.'}\n\nThank you,\nAWS SBG – Alpha`),[calendly,setCalendly]=useState('');
 const [locked,setLocked]=useState(false),[lastState,setLastState]=useState('');
 const pending=useRef<{id:string;payload:Record<string,unknown>}|null>(null);
 useEffect(()=>{const controller=new AbortController();let active=true;void communityRead(accountId,'messages',{applicationId:application.id},controller.signal).then(data=>{if(!active)return;if(!record(data)||!Array.isArray(data.items)||!data.items.every(isMessage))throw new Error('Message history could not be verified.');setMessages(data.items);setReady(data.emailReady===true);setError('')}).catch(error=>{if(active)setError(error instanceof Error?error.message:'Message history unavailable.')});return()=>{active=false;controller.abort()}},[accountId,application.id,retry]);
 function changeKind(next:string){setKind(next);const accepted=next==='accepted',rejected=next==='rejected';setSubject((accepted?'Welcome to Alpha':rejected?'Your Alpha application':next==='interview'?'Interview invitation':'Application update')+' · AWS SBG Alpha');setBody(`Hi ${application.data.profile.fullName},\n\n${accepted?'Congratulations! Your application has been accepted. Welcome to the AWS Student Builder Group – Alpha community.':rejected?'Thank you for your interest and the time you put into your application. We are unable to offer you this position in this recruitment cycle. We appreciate your effort and encourage you to stay connected with the community.':next==='interview'?'We would like to invite you to an interview. Please choose a suitable time using the scheduling link below.':'Here is an update about your application.'}\n\nThank you,\nAWS SBG – Alpha`)}
 async function send(){
  if(kind==='interview'&&!isCalendly(calendly)){setError('Enter an HTTPS calendly.com scheduling link.');return}
  if(!pending.current){if(!window.confirm(`Send this email from awslc.alpha@gmail.com to ${application.email}?\n\n${subject}\n\n${body}${kind==='interview'?'\n\n'+calendly:''}`))return;pending.current={id:crypto.randomUUID(),payload:{applicationId:application.id,version:application.version,kind,subject,body,calendly:kind==='interview'?calendly:''}};setLocked(true)}
  setBusy(true);setError('');setNotice('');
  try{const data=await communityCommand(accountId,'send',{id:pending.current.id,...pending.current.payload});if(!record(data))throw new Error('Delivery could not be confirmed.');setLastState(String(data.state));setNotice(data.state==='sent'?'Gmail accepted the email for delivery.':'Delivery is unconfirmed. Check the message history before creating another email.');setRetry(value=>value+1)}catch(error){setError(error instanceof Error?error.message:'Delivery could not be confirmed.');if(error instanceof CommunityClientError&&[400,422,429].includes(error.status)){pending.current=null;setLocked(false)}}finally{setBusy(false)}
 }
 return <section className="panel applicant-outreach"><h2>Applicant communication</h2>
  <a className="text-button" href={recruitmentPath('/api/community/file?kind=enrollment&accountId='+accountId+'&applicationId='+application.id)} target="_blank" rel="noopener noreferrer">Download proof of enrollment</a>
  <p>From <strong>awslc.alpha@gmail.com</strong> to {application.email}. Invitations include your Calendly link; decision emails must match the published outcome.</p>
  {!ready&&<p className="community-setup">Email sending is not connected. A System Admin must configure the Alpha mailbox before emails can be sent. You can prepare the message here.</p>}
  <form onSubmit={event=>{event.preventDefault();void send()}}><fieldset className="application-fields" disabled={busy||locked}>
   <label>Email type<select value={kind} onChange={event=>changeKind(event.target.value)}><option value="interview" disabled={application.status!=='Under Review'}>Interview invitation</option><option value="accepted" disabled={application.status!=='Accepted'}>Acceptance</option><option value="rejected" disabled={application.status!=='Not Selected'}>Not selected</option><option value="update">Application update</option></select></label>
   <label>Subject<input required maxLength={160} value={subject} onChange={event=>setSubject(event.target.value)}/></label>
   <label>Message<textarea required maxLength={5000} rows={7} value={body} onChange={event=>setBody(event.target.value)}/></label>
   {kind==='interview'&&<label>Calendly scheduling link<input required type="url" placeholder="https://calendly.com/alpha/interview" value={calendly} onChange={event=>setCalendly(event.target.value)}/></label>}
  </fieldset><p className="field-hint">Review the recipient, message and link before sending. The applicant also receives an in-app notification. Limits: three emails per applicant and 100 overall per 24 hours.</p>
  <div className="inline-actions"><button type="submit" className="button button-orange" disabled={!ready||busy||application.status==='Withdrawn'}>{busy?'Sending…':locked?'Check same email request':'Review and send email'}</button><button type="button" className="text-button" disabled={busy} onClick={()=>setRetry(value=>value+1)}>Refresh delivery history</button>{['sent','failed'].includes(lastState)&&<button type="button" className="text-button" onClick={()=>{pending.current=null;setLocked(false);setLastState('');setNotice('')}}>Create another message</button>}</div></form>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <details><summary>Recent email activity</summary><ul className="community-messages">{messages.map(message=><li key={message.id}><strong>{message.subject}</strong><span>{message.state==='sent'?'Accepted by Gmail':message.state==='sending'?'Delivery unconfirmed':message.state}</span><p>{message.body}</p></li>)}</ul>{!messages.length&&<p>No email requests recorded.</p>}</details>
  {administrator&&application.status==='Accepted'&&<MemberAdministration accountId={accountId} email={application.email} name={application.data.profile.fullName} position={opportunityLabel(getOpportunity(application.data.opportunityId))}/>}
 </section>;
}
