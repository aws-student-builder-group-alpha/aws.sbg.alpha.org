import type { Metadata } from 'next'
import {
	getSubmittedDocuments,
} from '@/services/admin.service'
import AdminSubmissions from './admin-submissions'

export const metadata: Metadata = {
	title: 'Submitted Documents | AWS Student Builder Group - Alpha',
	description:
		'Super-admin submitted document review for AWS Student Builder Group - Alpha.',
}

export default async function SubmissionsPage() {
	const bundle = await getSubmittedDocuments()

	return (
		<AdminSubmissions
			submissions={bundle.submissions}
			stats={bundle.stats}
		/>
	)
}
