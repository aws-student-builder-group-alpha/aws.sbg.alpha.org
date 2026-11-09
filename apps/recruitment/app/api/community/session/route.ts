import { accountSession } from '@/lib/server/session';
import { sameOrigin,communityFailure,communityResponse } from '@/lib/server/community-http';
import { CommunityError } from '@/lib/server/community';
import { createSupabaseClient } from '@/lib/supabase/server';
export async function GET(){
 const session=await accountSession();
 if(session.kind==='unavailable')return communityFailure(new CommunityError('Session check unavailable.',503));
 return communityResponse({signedIn:session.kind==='applicant'||session.kind==='staff'});
}
export async function POST(request:Request){try{
 sameOrigin(request);const client=await createSupabaseClient();if(!client)throw new CommunityError('Sign-out could not be confirmed.',503);
 const result=await client.auth.signOut({scope:'local'});if(result.error)throw new CommunityError('Sign-out could not be confirmed. Retry.',503);
 return communityResponse({signedIn:false});
}catch(error){return communityFailure(error)}}
