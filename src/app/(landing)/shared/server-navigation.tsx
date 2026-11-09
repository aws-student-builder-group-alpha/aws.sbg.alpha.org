import {
	getCurrentUser,
	getUserRole,
} from '@/services/auth.service'
import { COMBINED_PREVIEW } from '@/lib/recruitment'
import Navigation from './navigation'

export default async function ServerNavigation() {
	if (COMBINED_PREVIEW) return <Navigation />

	const user = await getCurrentUser()

	const initialAuth = user
		? {
				authenticated: true,
				label:
					user.user_metadata?.full_name ??
					user.user_metadata?.name ??
					user.email?.split('@')[0] ??
					'Account',
				role: await getUserRole(user.id),
			}
		: undefined

	return <Navigation initialAuth={initialAuth} />
}
