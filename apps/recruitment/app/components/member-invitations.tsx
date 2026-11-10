'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { communityCommand, communityRead } from '@/lib/community-client';
import { isMemberInvitation, type MemberInvitation } from '@/lib/community';
import { record } from '@/lib/drafts';
import { Callout } from './ui';

export function MemberInvitations({accountId,revision=0}:{accountId:string;revision?:number}) {
  const [items,setItems]=useState<MemberInvitation[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
  useEffect(()=>{const controller=new AbortController();void communityRead(accountId,'memberInvitations',{admin:'1'},controller.signal).then(data=>{
    if(!record(data)||!Array.isArray(data.items)||!data.items.every(isMemberInvitation))throw Error('Invitation history could not be verified.');
    setItems(data.items);setReady(data.emailReady===true);setError('');
  }).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Invitation history unavailable.')});return()=>controller.abort()},[accountId,revision,refresh]);
  async function act(invitation:MemberInvitation,send:boolean){
    const link=window.location.origin+(process.env.NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW==='1'?'/recruitment':'')+'/membership';
    const confirmation=send?`Send an Alpha membership invitation from awslc.alpha@gmail.com to ${invitation.email}?\n\n${invitation.full_name} · ${invitation.position}\nThey will sign in at ${link}, accept membership, then add their photo and download their ID. No recruitment form is required.`:`Cancel the pending membership invitation for ${invitation.email}?`;
    if(!window.confirm(confirmation))return;setBusy(true);setError('');setNotice('');
    try{const result=await communityCommand(accountId,send?'sendMemberInvitation':'cancelMemberInvitation',{id:invitation.id});
      setNotice(!send?'Invitation canceled.':record(result)&&result.state==='sent'?'Gmail accepted the invitation for delivery. Inbox arrival is not confirmed.':'Delivery was not confirmed. Check history; this invitation will not be automatically sent again.');setRefresh(value=>value+1);
    }catch(error){setError(error instanceof Error?error.message:'The action could not be confirmed. Check history before retrying.')}finally{setBusy(false)}
  }
  return <details className="community-invitation-history"><summary>Member invitations</summary>
    <p>Members sign in with their invited Google email and accept at <Link href="/membership">Membership ID</Link>. You can share that page’s link directly. No application is required.</p>
    {!ready&&<p className="community-setup">Email is not connected on this deployment. Save invitations and share the Membership ID link; do not describe them as emailed.</p>}
    <button type="button" className="text-button" disabled={busy} onClick={()=>setRefresh(value=>value+1)}>Refresh invitations</button>
    {error&&<Callout tone="error" role="alert">{error}</Callout>}{notice&&<Callout tone="success" role="status">{notice}</Callout>}
    <ul className="community-notifications">{items.map(item=><li key={item.id}><strong>{item.full_name} · {item.position}</strong><p>{item.email}</p><p>{item.state} · Email: {item.delivery==='sending'?'sending or awaiting acknowledgement':item.delivery==='sent'?'accepted by Gmail':item.delivery?.replaceAll('_',' ')}</p>{item.state==='pending'&&<div className="community-member-actions"><button type="button" className="button button-secondary" disabled={busy||!ready||item.delivery!=='not_sent'} onClick={()=>void act(item,true)}>Send invitation email</button><button type="button" className="text-button" disabled={busy} onClick={()=>void act(item,false)}>Cancel invitation</button></div>}</li>)}</ul>
  </details>;
}
