import { record } from "./drafts.ts";
export type Enrollment = { id: string; filename: string; size: number; createdAt: string };
export type Member = { id: string; full_name: string; position: string; joined_on: string; photo_path: string | null; status: string; version: number };
export type MemberInvitation = { id: string; full_name: string; position: string; joined_on: string; created_at: string; email?: string; state?: string; delivery?: string };
export function isMemberInvitation(value: unknown): value is MemberInvitation {
  return record(value) && ['id','full_name','position','joined_on','created_at'].every(key => typeof value[key] === 'string');
}
export type Notification = { id: string; kind: string; title: string; body: string; link: string | null; created_at: string; read_at: string | null };
export type Message = { id: string; kind: string; subject: string; body: string; calendly_url: string | null; state: string; created_at: string; completed_at: string | null };
export type AuditEvent = { id: string; actor_id: string | null; action: string; object_id: string; created_at: string };
export const enrollmentMaxBytes = 3 * 1024 * 1024;
export const photoMaxBytes = 2 * 1024 * 1024;
export function isCalendly(value: string) {
  try { const u=new URL(value); return u.protocol==='https:' && u.hostname==='calendly.com' && !u.username && !u.password && !u.port && u.pathname.length>1 && !/[\r\n]/.test(value); } catch { return false; }
}
export function uploadType(bytes: Uint8Array): "application/pdf" | "image/jpeg" | "image/png" | null {
  if (bytes.length>=5 && new TextDecoder().decode(bytes.slice(0,5))==='%PDF-') return 'application/pdf';
  if (bytes.length>=8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return 'image/png';
  if (bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  return null;
}
export function isEnrollment(value: unknown): value is Enrollment {
  return record(value) && typeof value.id==='string' && typeof value.filename==='string' && typeof value.size==='number' && typeof value.createdAt==='string';
}
export function isMember(value: unknown): value is Member {
  return record(value) && typeof value.id==='string' && typeof value.full_name==='string' && typeof value.position==='string' && typeof value.joined_on==='string' && (value.photo_path===null||typeof value.photo_path==='string') && typeof value.status==='string' && typeof value.version==='number';
}
export function isNotification(v:unknown):v is Notification{return record(v)&&typeof v.id==='string'&&typeof v.kind==='string'&&typeof v.title==='string'&&typeof v.body==='string'&&(v.link===null||typeof v.link==='string')&&typeof v.created_at==='string'&&(v.read_at===null||typeof v.read_at==='string')}
export function isMessage(v:unknown):v is Message{return record(v)&&typeof v.id==='string'&&typeof v.kind==='string'&&typeof v.subject==='string'&&typeof v.body==='string'&&(v.calendly_url===null||typeof v.calendly_url==='string')&&typeof v.state==='string'&&typeof v.created_at==='string'}
