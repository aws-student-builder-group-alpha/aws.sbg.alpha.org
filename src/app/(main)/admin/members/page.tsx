import {
	getAllMembers,
	getAllCategories,
	getMemberEnrollments,
} from '@/services/admin.service'
import AdminMembers from './admin-members'

export default async function MembersPage() {
	const [members, allCategories] = await Promise.all([
		getAllMembers(),
		getAllCategories(),
	])

	const superAdminEmails = (
		process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL ?? ''
	)
		.toLowerCase()
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean)

	// Fetch enrollments for all non-admin members
	const enrollmentsByMember: Record<string, string[]> = {}
	await Promise.all(
		members
			.filter(
				(m) =>
					!superAdminEmails.includes(
						m.email.toLowerCase(),
					),
			)
			.map(async (m) => {
				enrollmentsByMember[m.id] =
					await getMemberEnrollments(m.id)
			}),
	)

	return (
		<AdminMembers
			members={members}
			superAdminEmails={superAdminEmails}
			allCategories={allCategories}
			enrollmentsByMember={enrollmentsByMember}
		/>
	)
}
