import type { Metadata } from 'next'
import { requireUser } from '@/services/auth.service'
import { redirect } from 'next/navigation'
import AdminShell from './admin-shell'

export const metadata: Metadata = {
	title: 'Admin | AWS Student Builder Group - Alpha',
	description:
		'Super-admin dashboard for AWS Student Builder Group - Alpha.',
}

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const user = await requireUser('/admin')
	const superAdminEmails = (
		process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL ?? ''
	)
		.toLowerCase()
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean)

	const userEmail = user.email?.toLowerCase() ?? ''

	if (!superAdminEmails.includes(userEmail)) {
		redirect('/skillbuilder/dashboard')
	}

	return (
		<AdminShell userEmail={user.email ?? ''}>
			{children}
		</AdminShell>
	)
}
