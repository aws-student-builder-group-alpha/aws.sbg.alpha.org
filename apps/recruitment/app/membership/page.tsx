import { Suspense } from 'react';
import { accountSession } from '@/lib/server/session';
import { AccessGuard } from '@/app/components/access-guard';
import { ProcessShell } from '@/app/components/process-shell';
import { signIn } from '@/app/auth/actions';
import { MemberWorkspace } from './member-workspace';
import { recruitmentBasePath } from '@/lib/site-paths';
export default function MembershipPage(){return <ProcessShell><Suspense fallback={<main id="main-content" className="container portal"><p role="status">Checking membership access…</p></main>}><MembershipContent/></Suspense></ProcessShell>}
async function MembershipContent(){
 if(recruitmentBasePath&&process.env.ALPHA_PRACTICE_FORM==='1')return <MemberWorkspace accountId="practice-member" practice/>;
 const session=await accountSession();
 if(session.kind==='applicant'||session.kind==='staff'&&session.membership.status==='active'&&!session.needsMfa)return <AccessGuard accountId={session.identity.id} expected={session.kind==='staff'?session.membership.role:'applicant'}><MemberWorkspace key={session.identity.id} accountId={session.identity.id}/></AccessGuard>;
 return <main id="main-content" className="container portal narrow"><section className="panel"><h1>Find your Alpha membership ID</h1><p>Sign in with the Google account registered by your organization. Your ID is available after membership approval.</p><form action={signIn}><input name="destination" value="membership" type="hidden"/><button type="submit" className="button button-orange">Continue with Google</button></form></section></main>;
}
