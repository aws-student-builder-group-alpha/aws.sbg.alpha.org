'use client';
import { useRouter } from 'next/navigation';
import { signIn } from '@/app/(recruitment)/recruitment/auth/actions';
import { MembershipFrame, MembershipWelcome } from './membership-frame';
import { record } from '@/recruitment/lib/drafts';
import { useEffect,useRef,useState } from 'react';
import { communityCommand,communityRead,uploadMemberPhoto } from '@/recruitment/lib/community-client';
import { isMember,isMemberInvitation,photoMaxBytes,uploadType,type Member,type MemberInvitation } from '@/recruitment/lib/community';
import { drawMemberCard } from '@/recruitment/lib/member-card';
import { recruitmentPath } from '@/recruitment/lib/site-paths';
export function MemberWorkspace({accountId,accountEmail,practice=false}:{accountId:string;accountEmail?:string;practice?:boolean}){
 const router=useRouter();
 const [invitations,setInvitations]=useState<MemberInvitation[]>([]),[failed,setFailed]=useState(false);
 const [member,setMember]=useState<Member|null>(null),[name,setName]=useState(''),[search,setSearch]=useState(''),[photo,setPhoto]=useState<string|null>(null),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[drawnFor,setDrawnFor]=useState(''),[retry,setRetry]=useState(0);
 const canvas=useRef<HTMLCanvasElement>(null);
 const signature=member?`${member.id}:${member.version}:${member.full_name}:${photo||''}`:'';
 const cardReady=!!signature&&signature===drawnFor;
 useEffect(()=>{
  const controller=new AbortController();let active=true;let objectUrl:string|null=null;
  const load=async()=>{setLoading(true);setFailed(false);try{
   const data=practice?{id:'ALPHA-PREVIEW-000001',full_name:'Alpha Builder',position:'Committee Member',joined_on:'2026-11-09',photo_path:null,status:'active',version:1}:await communityRead(accountId,'member',{},controller.signal);
   const pending=practice||isMember(data)?{items:[]}:await communityRead(accountId,'memberInvitations',{},controller.signal);
   if(!record(pending)||!Array.isArray(pending.items)||!pending.items.every(isMemberInvitation))throw new Error('Invitations could not be verified.');if(active)setInvitations(pending.items);
   if(data!==null&&!isMember(data))throw new Error('Membership could not be verified.');if(!active)return;setMember(data);setName(data?.full_name||'');setPhoto(null);
   if(data?.photo_path){const response=await fetch(recruitmentPath('/recruitment/api/community/file?kind=photo&accountId='+accountId),{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('Your saved photo could not be loaded.');objectUrl=URL.createObjectURL(await response.blob());if(active)setPhoto(objectUrl)}
   if(active)setMessage('');
  }catch(error){if(active){setFailed(true);setMessage(error instanceof Error?error.message:'Membership unavailable.')}}finally{if(active)setLoading(false)}};
  void load();return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[accountId,practice,retry]);
 useEffect(()=>{let active=true;const controller=new AbortController();if(!member||!canvas.current)return;void drawMemberCard(canvas.current,member,photo,controller.signal).then(()=>{if(active)setDrawnFor(signature)}).catch(()=>{if(active)setMessage('The ID preview could not be drawn. Reload and try again.')});return()=>{active=false;controller.abort()}},[member,photo,signature]);
 useEffect(()=>()=>{if(practice&&photo)URL.revokeObjectURL(photo)},[practice,photo]);
 useEffect(()=>{if(member||busy||practice)return;const refresh=()=>{if(document.visibilityState==='visible')setRetry(value=>value+1)};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);const timer=setInterval(refresh,30000);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);clearInterval(timer)}},[member,busy,practice]);
 async function accept(invitation:MemberInvitation){if(!window.confirm(`Accept Alpha membership as ${invitation.position}, joined ${invitation.joined_on}, for ${accountEmail || 'your signed-in Google account'}?`))return;setBusy(true);setMessage('');try{const data=await communityCommand(accountId,'acceptMemberInvitation',{id:invitation.id});if(!isMember(data))throw Error('Acceptance could not be confirmed. Check again before retrying.');setMember(data);setName(data.full_name);setInvitations([]);setRetry(value=>value+1);router.refresh()}catch(error){setMessage(error instanceof Error?error.message:'Acceptance could not be confirmed.')}finally{setBusy(false)}}
 async function lookup(){setBusy(true);try{const data=await communityRead(accountId,'member',{id:search.trim()});if(!isMember(data))throw new Error('No active membership ID matching your account was found.');setMember(data);setName(data.full_name);setMessage('Membership ID found.')}catch(error){setMessage(error instanceof Error?error.message:'ID lookup failed.')}finally{setBusy(false)}}
 async function save(form:HTMLFormElement){if(!member)return;setBusy(true);setMessage('');try{
  const data=new FormData(form),file=data.get('photo');let result:unknown;
  if(file instanceof File&&file.size){if(file.size>photoMaxBytes)throw new Error('Choose a JPG or PNG image up to 2 MB.');const mime=uploadType(new Uint8Array(await file.arrayBuffer()));if(!mime||mime==='application/pdf'||mime!==file.type)throw new Error('Choose a JPG or PNG image up to 2 MB.');
   if(practice){const url=URL.createObjectURL(file);setPhoto(current=>{if(current)URL.revokeObjectURL(current);return url});result={...member,full_name:name,photo_path:'practice-photo'}}
   else result=await uploadMemberPhoto(accountId,name,file);
  }else result=practice?{...member,full_name:name}:await communityCommand(accountId,'updateMember',{name});
  if(!isMember(result))throw new Error('The membership update could not be confirmed.');setMember(result);if(!practice)setRetry(value=>value+1);setMessage(practice?'Practice profile updated. Nothing was stored.':'Your membership profile was saved.');
 }catch(error){setMessage(error instanceof Error?error.message:'The update could not be confirmed.')}finally{setBusy(false)}}
 function download(){if(!canvas.current||!member||!photo||!cardReady)return;canvas.current.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=member.id+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png')}
 return <MembershipFrame account={<>{accountEmail&&<span>{accountEmail}</span>}<form action={signIn}><input type="hidden" name="destination" value="membership"/><button type="submit" className="text-button">Switch account</button></form></>}>
  {practice&&<p className="membership-practice">Sample preview · Not an issued ID</p>}
  {loading?<MembershipWelcome title="Finding your membership" description="Your Alpha identity, all in one place."><p role="status" className="membership-loading">Checking membership…</p></MembershipWelcome>:!member?<MembershipWelcome title={invitations.length?"You’re invited":failed?"Unable to check membership":"No ID linked yet"} description={invitations.length?"Your next chapter starts here.":failed?"We couldn’t verify your membership. Try again shortly.":"Ask a System Admin to invite this Google account."}>
    {invitations.map(invitation=><article className="membership-invitation" key={invitation.id}><h3>{invitation.full_name}</h3><p>{invitation.position} · Joined {invitation.joined_on}</p><button type="button" className="button button-orange" disabled={busy} onClick={()=>void accept(invitation)}>Accept membership</button></article>)}
    <button type="button" className="button button-secondary" disabled={busy} onClick={()=>setRetry(value=>value+1)}>Check again</button>
    <details className="membership-help"><summary>Invited with another email?</summary><p>Switch to the Google account Alpha invited. Existing members don’t need a recruitment application.</p></details>
   </MembershipWelcome>:<>
   <div className="membership-columns">
    <section className="membership-card-stage" aria-label="Your membership card"><div className="membership-stage-heading"><span className="membership-status">{member.status === 'active' ? 'Active member' : 'Membership'}</span><span>YOUR ALPHA ID</span></div><div className="membership-card-preview"><canvas ref={canvas} aria-label={`Alpha membership card for ${member.full_name}. ${member.position}. Joined ${member.joined_on}. ID ${member.id}.`}/></div><div className="membership-download"><button type="button" className="button button-orange" disabled={!photo||!cardReady||busy} onClick={download}>Download ID <span aria-hidden="true">↓</span></button><p>{!photo?"Add a portrait to enable download.":!cardReady?"Preparing your card…":"PNG · Ready to take with you"}</p></div></section>
    <section className="membership-editor"><p className="membership-kicker">MAKE IT YOURS</p><h2>Card details</h2><details className="membership-edit-details" open={!member.photo_path}><summary>{member.photo_path?"Edit card details":"Complete your card"}</summary><form onSubmit={event=>{event.preventDefault();void save(event.currentTarget)}}><fieldset className="application-fields" disabled={busy}>
      <label htmlFor="member-name">Full name<input id="member-name" name="name" required maxLength={120} value={name} onChange={event=>setName(event.target.value)}/></label>
      <label htmlFor="member-photo">Portrait<input id="member-photo" name="photo" type="file" accept="image/jpeg,image/png" required={!member.photo_path}/></label><p className="field-hint">JPG or PNG · Up to 2 MB · Cropped to fit</p>
      <label className="checkbox-label"><input type="checkbox" required/>I agree to use this photo on my Alpha membership ID.</label><button type="submit" className="button button-orange">{busy?'Saving…':'Save details'}</button>
     </fieldset></form></details><details className="membership-help"><summary>Need to change membership details?</summary><p>Ask a System Admin to correct your position or joining date.</p></details>
    </section>
   </div>
   {!practice&&<details className="membership-tools"><summary>Find ID</summary><form className="membership-search" onSubmit={event=>{event.preventDefault();void lookup()}}><label htmlFor="membership-search">Membership ID</label><div className="inline-actions"><input id="membership-search" value={search} onChange={event=>setSearch(event.target.value)} maxLength={40} placeholder="ALPHA-2026-…" required/><button className="button button-secondary" type="submit" disabled={busy}>Find ID</button></div><p className="field-hint">Only IDs linked to your account can be found.</p></form></details>}
  </>}
  {message&&<p className="membership-message" role="status">{message}</p>}
 </MembershipFrame>;
}
