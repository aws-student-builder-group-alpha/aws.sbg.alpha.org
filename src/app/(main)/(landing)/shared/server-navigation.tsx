import {
	getCurrentUser,
	getUserRole,
} from '@/services/auth.service'
import Navigation from './navigation'

export default async function ServerNavigation() {

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
