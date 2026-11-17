import { getLeaderboard } from '@/services/admin.service'
import AdminLeaderboard from './admin-leaderboard'

export default async function LeaderboardPage() {
	const leaderboard = await getLeaderboard()

	return <AdminLeaderboard entries={leaderboard} />
}
