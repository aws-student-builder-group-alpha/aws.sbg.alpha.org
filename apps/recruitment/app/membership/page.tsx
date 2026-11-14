import { Suspense } from 'react';
import { accountSession } from '@/lib/server/session';
import { AccessGuard } from '@/app/components/access-guard';
import { ProcessShell } from '@/app/components/process-shell';
import { signIn } from '@/app/auth/actions';
import { MembershipFrame, MembershipWelcome } from './membership-frame';
import { MemberWorkspace } from './member-workspace';
import { recruitmentBasePath } from '@/lib/site-paths';
export default function MembershipPage(){return <ProcessShell contentHeight><Suspense fallback={<MembershipFrame><MembershipWelcome title="Finding your membership" description="Your Alpha identity, all in one place."><p role="status">Checking membership access…</p></MembershipWelcome></MembershipFrame>}><MembershipContent/></Suspense></ProcessShell>}
async function MembershipContent(){
 if(recruitmentBasePath&&process.env.ALPHA_PRACTICE_FORM==='1')return <MemberWorkspace accountId="practice-member" practice/>;
 const session=await accountSession();
 if(session.kind==='applicant'||session.kind==='staff'&&session.membership.status==='active'&&!session.needsMfa)return <AccessGuard accountId={session.identity.id} expected={session.kind==='staff'?session.membership.role:'applicant'}><MemberWorkspace key={session.identity.id} accountId={session.identity.id} accountEmail={session.identity.email}/></AccessGuard>;
 return <MembershipFrame><MembershipWelcome title="Your Alpha identity" description="Sign in with the Google account registered with Alpha."><form action={signIn}><input name="destination" value="membership" type="hidden"/><button type="submit" className="button button-orange">Continue with Google</button></form></MembershipWelcome></MembershipFrame>;
}
