import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import SkillbuilderLanding from './skillbuilder-landing'
import { getCurrentUser } from '@/services/auth.service'

export const metadata: Metadata = {
	title: 'Skillbuilder | AWS Student Builder Group - Alpha',
	description:
		'A structured learning roadmap for AWS Cloud, AI/ML, CyberSecurity, and more. Track your progress through hands-on modules.',
}

export default async function SkillbuilderPage() {
	const user = await getCurrentUser()

	if (user) {
		redirect('/skillbuilder/dashboard')
	}

	return <SkillbuilderLanding isSignedIn={false} />
}
