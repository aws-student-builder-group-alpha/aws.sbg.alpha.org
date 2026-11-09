'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { communityCommand,communityRead } from '@/lib/community-client';
import { isCalendly,isNotification,type Notification } from '@/lib/community';
import { formatDate } from '@/lib/format-date';
export function NotificationInbox({accountId}:{accountId:string}){
 const [items,setItems]=useState<Notification[]>([]),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  const load=async()=>{if(document.hidden)return;try{const data=await communityRead(accountId,'notifications',{},controller.signal);if(!Array.isArray(data)||!data.every(isNotification))throw new Error('Notifications could not be verified.');if(active){setItems(data);setMessage('')}}catch(error){if(active)setMessage(error instanceof Error?error.message:'Notifications are unavailable.')}};
  void load();window.addEventListener('focus',load);const timer=setInterval(()=>void load(),60000);
  return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',load)};
 },[accountId,retry]);
 async function mark(id:string){try{const data=await communityCommand(accountId,'read',{id});if(Array.isArray(data)&&data.every(isNotification))setItems(data)}catch(error){setMessage(error instanceof Error?error.message:'Could not mark this notification as read.')}}
 return <section className="panel community-inbox" aria-labelledby="notification-heading">
  <div className="subheading"><h2 id="notification-heading">Notifications <span className="muted">{items.filter(item=>!item.read_at).length} unread</span></h2><button type="button" className="text-button" onClick={()=>setRetry(value=>value+1)}>Refresh</button></div>
  {message&&<p role="alert">{message}</p>}
  {!items.length&&!message&&<p>Application status updates and interview invitations will appear here.</p>}
  <ul className="community-notifications">{items.map(item=><li key={item.id} data-unread={!item.read_at}><h3>{item.title}</h3><p>{item.body}</p><time dateTime={item.created_at}>{formatDate(item.created_at)} Philippine time</time><div className="inline-actions">{item.link&&isCalendly(item.link)&&<a className="button button-secondary" href={item.link} target="_blank" rel="noopener noreferrer">Choose an interview schedule</a>}{!item.read_at&&<button type="button" className="text-button" onClick={()=>void mark(item.id)}>Mark as read</button>}</div></li>)}</ul>
  <Link href="/membership" className="text-button">Find your Alpha membership ID</Link>
 </section>;
}
