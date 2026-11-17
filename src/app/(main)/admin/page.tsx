import {
	getAdminOverviewStats,
	getCategoryCompletionStats,
	getWeeklyActivity,
	getLeaderboard,
} from '@/services/admin.service'
import AdminOverview from './admin-overview'

export default async function AdminPage() {
	const [stats, categoryStats, weeklyActivity, leaderboard] =
		await Promise.all([
			getAdminOverviewStats(),
			getCategoryCompletionStats(),
			getWeeklyActivity(),
			getLeaderboard(),
		])

	return (
		<AdminOverview
			stats={stats}
			categoryStats={categoryStats}
			weeklyActivity={weeklyActivity}
			topMembers={leaderboard.slice(0, 5)}
		/>
	)
}
