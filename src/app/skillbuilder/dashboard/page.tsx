import type { Metadata } from 'next'
import SkillbuilderDashboard from './skillbuilder-dashboard'
import PendingApproval from './pending-approval'
import OathGate from './oath-gate'
import {
	requireUser,
	getIsApproved,
	getHasAcceptedOath,
} from '@/services/auth.service'
import {
	getSkillbuilderSnapshot,
	getMemberLeaderboard,
} from '@/services/skillbuilder.service'

export const metadata: Metadata = {
	title: 'Dashboard | Skillbuilder | AWS Student Builder Group - Alpha',
	description:
		'Track your progress through AWS SkillBuilder Challenge modules across all department tracks.',
}

export default async function SkillbuilderDashboardPage() {
	const user = await requireUser('/skillbuilder/dashboard')
	const [isApproved, hasAcceptedOath] = await Promise.all([
		getIsApproved(user.id),
		getHasAcceptedOath(user.id),
	])

	// Super-admins are always approved
	const superAdminEmails = (
		process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL ?? ''
	)
		.toLowerCase()
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean)

	const isSuperAdmin = superAdminEmails.includes(
		user.email?.toLowerCase() ?? '',
	)

	if (!isApproved && !isSuperAdmin) {
		return (
			<PendingApproval
				userEmail={user.email ?? ''}
			/>
		)
	}

	// Gate: oath not accepted — render ONLY the oath modal
	// No dashboard data is fetched or sent to the client
	if (!hasAcceptedOath) {
		return <OathGate />
	}

	const [snapshot, leaderboard] = await Promise.all([
		getSkillbuilderSnapshot(user.id, isSuperAdmin),
		getMemberLeaderboard(),
	])
	const initialAuth = {
		authenticated: true,
		label:
			user.user_metadata?.full_name ??
			user.user_metadata?.name ??
			user.email?.split('@')[0] ??
			'Account',
	}

	return (
		<SkillbuilderDashboard
			initialSnapshot={snapshot}
			userEmail={user.email ?? ''}
			initialAuth={initialAuth}
			leaderboard={leaderboard}
			currentUserId={user.id}
		/>
	)
}
