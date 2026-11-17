import { isMember } from './community.ts';

/** A failed lookup is not evidence that a signed-in person has no membership. */
export async function memberEntry(client: { rpc: (name: 'alpha_member' | 'alpha_member_invitations') => PromiseLike<{ data: unknown; error: unknown }> }) {
  const member = await client.rpc('alpha_member');
  if (member.error) return 'unavailable';
  if (member.data !== null && !isMember(member.data)) return 'unavailable';
  if (isMember(member.data) && member.data.status === 'active') return 'membership';
  const invitations = await client.rpc('alpha_member_invitations');
  if (invitations.error || !Array.isArray(invitations.data)) return 'unavailable';
  return invitations.data.length ? 'membership' : 'application';
}
