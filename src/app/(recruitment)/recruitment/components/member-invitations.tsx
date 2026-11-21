'use client';
import Link from 'next/link';
import { ListSkeleton } from "@/app/(recruitment)/recruitment/components/workspace-skeleton";
import { useEffect, useId, useState } from 'react';
import { communityCommand, communityRead } from '@/recruitment/lib/community-client';
import { isMemberInvitation, type MemberInvitation } from '@/recruitment/lib/community';
import { record } from '@/recruitment/lib/drafts';
import { Badge, Callout, EmptyState, Icon } from './ui';
import { useAdminNavigationGuard } from './admin-navigation-guard';

function invitationStatus(state: string | undefined) {
  if (state === "pending") return { label: "Pending", tone: "orange" };
  if (state === "accepted") return { label: "Accepted", tone: "green" };
  if (state === "canceled") return { label: "Canceled", tone: "neutral" };
  return { label: "Status unavailable", tone: "neutral" };
}

function emailStatus(delivery: string | undefined) {
  switch (delivery) {
    case "not_sent": return "Not sent";
    case "sending": return "Sending or awaiting acknowledgement";
    case "sent": return "Accepted by Gmail";
    case "failed": return "Failed";
    case "uncertain": return "Delivery unconfirmed";
    default: return "Unavailable";
  }
}

export function MemberInvitations({accountId,revision=0,workspace=false}:{accountId:string;revision?:number;workspace?:boolean}) {
  const [items,setItems]=useState<MemberInvitation[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
  const [loaded,setLoaded]=useState(false);
  const headingId = useId();
  useAdminNavigationGuard(false,busy);
  useEffect(()=>{const controller=new AbortController();void communityRead(accountId,'memberInvitations',{admin:'1'},controller.signal).then(data=>{
    if(!record(data)||!Array.isArray(data.items)||!data.items.every(isMemberInvitation))throw Error('Invitation history could not be verified.');
    setItems(data.items);setReady(data.emailReady===true);setError('');setLoaded(true);
  }).catch(error=>{if(!controller.signal.aborted){setError(error instanceof Error?error.message:'Invitation history unavailable.');setLoaded(true)}});return()=>controller.abort()},[accountId,revision,refresh]);
  async function act(invitation:MemberInvitation,send:boolean){
    const link=window.location.origin+'/recruitment/membership';
    const confirmation=send?`Send an Alpha membership invitation from awslc.alpha@gmail.com to ${invitation.email}?\n\n${invitation.full_name} · ${invitation.position}\nThey will sign in at ${link}, accept membership, then add their photo and download their ID. No recruitment form is required.`:`Cancel the pending membership invitation for ${invitation.email}?`;
    if(!window.confirm(confirmation))return;setBusy(true);setError('');setNotice('');
    try{const result=await communityCommand(accountId,send?'sendMemberInvitation':'cancelMemberInvitation',{id:invitation.id});
      setNotice(!send?'Invitation canceled.':record(result)&&result.state==='sent'?'Gmail accepted the invitation for delivery. Inbox arrival is not confirmed.':'Delivery was not confirmed. Check history; this invitation will not be automatically sent again.');setRefresh(value=>value+1);
    }catch(error){setError(error instanceof Error?error.message:'The action could not be confirmed. Check history before retrying.')}finally{setBusy(false)}
  }
  const Heading = workspace ? "h2" : "h3";
  return <section className={workspace ? "community-admin-panel member-invitations-panel" : "community-invitation-history"} aria-labelledby={headingId} data-admin-pending={busy || undefined}>
    <header className="member-invitations-heading">
      <Heading id={headingId}>Member invitations</Heading>
      <button type="button" className="button button-secondary member-invitation-refresh" disabled={busy} onClick={() => setRefresh(value => value + 1)}>
        <Icon name="reset" size={15} />Refresh invitations
      </button>
    </header>
    <p className="member-invitation-guidance">Members use their invited Google account to accept at <Link href="/recruitment/membership">Membership ID</Link>. You can share that link directly.</p>
    {!loaded&&<ListSkeleton label="Loading invitations..." />}
    {loaded&&!error&&!ready&&<Callout className="member-invitation-email" tone="info" title="Invitation email unavailable">Share the Membership ID link with invited members.</Callout>}
    {error&&<Callout tone="error" role="alert">{error}</Callout>}{notice&&<Callout tone="success" role="status">{notice}</Callout>}
    {loaded && !error && !busy && !items.length && <EmptyState compact icon="mail" title="No membership invitations yet"
      description="Invitations created in Organization members will appear here." />}
    {items.length > 0 && <div className="member-invitation-table-wrap">
      <table className="member-invitation-table" role="table" aria-labelledby={headingId}>
        <thead role="rowgroup"><tr role="row">
          <th scope="col" role="columnheader">Member</th>
          <th scope="col" role="columnheader">Invitation status</th>
          <th scope="col" role="columnheader">Email delivery</th>
          <th scope="col" role="columnheader">Actions</th>
        </tr></thead>
        <tbody role="rowgroup">{items.map(item => {
          const status = invitationStatus(item.state);
          return <tr key={item.id} role="row">
            <td role="cell" className="member-invitation-identity">
              <div className="member-invitation-name">
                <strong>{item.full_name}</strong>
                {workspace && <span className="member-invitation-compact-status"><Badge tone={status.tone}>{status.label}</Badge></span>}
              </div>
              <span>{item.position}</span>
              {item.email && <span>{item.email}</span>}
            </td>
            <td role="cell" className="member-invitation-status-cell" data-label="Invitation status"><Badge tone={status.tone}>{status.label}</Badge></td>
            <td role="cell" data-label="Email delivery">{emailStatus(item.delivery)}</td>
            <td role="cell" className="member-invitation-actions-cell">{item.state === "pending" && <div className="community-member-actions">
              <button type="button" className="button button-secondary" disabled={busy || !ready || item.delivery !== "not_sent"} onClick={() => void act(item, true)}>Send invitation email</button>
              <button type="button" className="text-button" disabled={busy} onClick={() => void act(item, false)}>Cancel invitation</button>
            </div>}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
  </section>;
}
