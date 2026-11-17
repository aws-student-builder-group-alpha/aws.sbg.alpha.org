'use server'

import { z } from 'zod'
import { requireSuperAdminUserId } from '@/actions/_auth-guards'
import { getSupabaseAdminClient } from '@/services/supabase-admin.service'

const schema = z.object({
	memberId: z.string().uuid(),
})

export async function deleteMemberAction(memberId: string) {
	const parsed = schema.safeParse({ memberId })
	if (!parsed.success) {
		return {
			ok: false as const,
			message: 'Invalid input.',
		}
	}

	await requireSuperAdminUserId()
	const supabaseAdmin = getSupabaseAdminClient()
	const id = parsed.data.memberId

	// Remove only Skillbuilder data; recruitment shares the Auth identity.
	for (const table of ['module_submissions', 'module_progress', 'member_enrollments'] as const) {
		const { error } = await supabaseAdmin.from(table).delete().eq('user_id', id)
		if (error) return { ok: false as const, message: error.message }
	}

	// Delete the profile
	const { error: profileError } = await supabaseAdmin
		.from('profiles')
		.delete()
		.eq('id', id)

	if (profileError) {
		return {
			ok: false as const,
			message: profileError.message,
		}
	}

	// The Auth identity is shared with recruitment and must remain intact.

	return {
		ok: true as const,
		message: 'Member deleted successfully.',
	}
}
