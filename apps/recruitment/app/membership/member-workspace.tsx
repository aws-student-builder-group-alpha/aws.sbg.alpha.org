'use client';
import { useRouter } from 'next/navigation';
import { signIn } from '@/app/auth/actions';
import { alphaSiteOrigin } from '@/lib/site-paths';
import { record } from '@/lib/drafts';
import { useEffect,useRef,useState } from 'react';
import { communityCommand,communityFetch,communityRead } from '@/lib/community-client';
import { isMember,isMemberInvitation,photoMaxBytes,uploadType,type Member,type MemberInvitation } from '@/lib/community';
import { drawMemberCard } from '@/lib/member-card';
import { recruitmentPath } from '@/lib/site-paths';
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
   if(data?.photo_path){const response=await fetch(recruitmentPath('/api/community/file?kind=photo&accountId='+accountId),{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('Your saved photo could not be loaded.');objectUrl=URL.createObjectURL(await response.blob());if(active)setPhoto(objectUrl)}
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
   else{data.set('accountId',accountId);data.set('kind','photo');result=await communityFetch('/api/community/upload',{method:'POST',body:data})}
  }else result=practice?{...member,full_name:name}:await communityCommand(accountId,'updateMember',{name});
  if(!isMember(result))throw new Error('The membership update could not be confirmed.');setMember(result);if(!practice)setRetry(value=>value+1);setMessage(practice?'Practice profile updated. Nothing was stored.':'Your membership profile was saved.');
 }catch(error){setMessage(error instanceof Error?error.message:'The update could not be confirmed.')}finally{setBusy(false)}}
 function download(){if(!canvas.current||!member||!photo||!cardReady)return;canvas.current.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=member.id+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png')}
 return <main id="main-content" className="container portal membership-workspace"><div className="panel membership-surface"><div className="subheading"><div><p className="eyebrow">YOUR PLACE AT ALPHA</p><h1>Membership ID</h1></div><a href={alphaSiteOrigin+"/"} className="text-button">Alpha home</a></div>
  <p>Your Alpha identity, ready to take with you. No recruitment application is needed for an invited existing member.</p>{accountEmail&&<p className="field-hint">Signed in as <strong>{accountEmail}</strong>. Use the exact Google email Alpha invited.</p>}{practice&&<p className="community-setup">Practice membership preview. This is a sample card, not an issued membership.</p>}
  {loading?<p role="status">Checking your membership…</p>:!member?<section>{invitations.length>0?<><h2>Your membership invitation</h2>{invitations.map(invitation=><article className="community-member-steps" key={invitation.id}><h3>{invitation.full_name}</h3><p>{invitation.position} · Joined {invitation.joined_on}</p><button type="button" className="button button-orange" disabled={busy} onClick={()=>void accept(invitation)}>Accept membership</button></article>)}</>:<><h2>{failed?"Membership could not be verified":"No membership linked to this account yet"}</h2><p>{failed?"Retry to check your current membership. An unavailable lookup does not mean your membership was removed.":"Ask a System Admin to invite this exact Google email. If you were invited at another address, switch accounts below."}</p></>}<button type="button" className="button button-secondary" onClick={()=>setRetry(value=>value+1)}>Check again</button><form action={signIn}><input type="hidden" name="destination" value="membership"/><button type="submit" className="text-button">Use another Google account</button></form></section>:<>
   {!practice&&<form className="membership-search" onSubmit={event=>{event.preventDefault();void lookup()}}><label htmlFor="membership-search">Find your membership ID</label><div className="inline-actions"><input id="membership-search" value={search} onChange={event=>setSearch(event.target.value)} maxLength={40} placeholder="ALPHA-2026-…" required/><button className="button button-secondary" type="submit" disabled={busy}>Find ID</button></div><p className="field-hint">For privacy, lookup shows only the membership linked to your signed-in account.</p></form>}
   <div className="membership-columns"><div className="membership-card-preview"><canvas ref={canvas} aria-label={`Alpha membership card for ${member.full_name}. ${member.position}. Joined ${member.joined_on}. ID ${member.id}.`}/><button type="button" className="button button-orange" disabled={!photo||!cardReady||busy} onClick={download}>Download membership ID</button>{!photo&&<p className="field-hint">Add your photo to enable the downloadable ID.</p>}</div>
    <form onSubmit={event=>{event.preventDefault();void save(event.currentTarget)}}><fieldset className="application-fields" disabled={busy}>
     <h2>Complete your card</h2><label htmlFor="member-name">Your full name<input id="member-name" name="name" required maxLength={120} value={name} onChange={event=>setName(event.target.value)}/></label>
     <p><strong>{member.position}</strong><br/>Joined {member.joined_on}</p><p className="field-hint">Ask a System Admin to correct your position or joining date.</p>
     <label htmlFor="member-photo">ID photo<input id="member-photo" name="photo" type="file" accept="image/jpeg,image/png" required={!member.photo_path}/></label><p className="field-hint">JPG or PNG, up to 2 MB. Use a clear portrait; it will be cropped to fit your ID.</p>
     <label className="checkbox-label"><input type="checkbox" required/>I agree to use this photo on my Alpha membership ID.</label><button type="submit" className="button button-orange">{busy?'Saving…':'Save card details'}</button>
    </fieldset></form></div>
  </>}{message&&<p role="status">{message}</p>}
 </div></main>;
}
