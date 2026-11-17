'use server'

import { z } from 'zod'
import { requireSuperAdminUserId } from '@/actions/_auth-guards'
import { getSupabaseAdminClient } from '@/services/supabase-admin.service'

const schema = z.object({
	memberId: z.string().uuid(),
	approved: z.boolean(),
})

export async function approveMemberAction(
	memberId: string,
	approved: boolean,
) {
	const parsed = schema.safeParse({ memberId, approved })
	if (!parsed.success) {
		return {
			ok: false as const,
			message: 'Invalid input.',
		}
	}

	await requireSuperAdminUserId()
	const supabaseAdmin = getSupabaseAdminClient()

	const updateData: { is_approved: boolean; has_accepted_oath?: boolean } = {
		is_approved: parsed.data.approved,
	}

	// Revoking access also resets the oath so they
	// must re-accept it when re-approved
	if (!parsed.data.approved) {
		updateData.has_accepted_oath = false
	}

	const { error } = await supabaseAdmin
		.from('profiles')
		.update(updateData)
		.eq('id', parsed.data.memberId)

	if (error) {
		return {
			ok: false as const,
			message: error.message,
		}
	}

	return {
		ok: true as const,
		message: parsed.data.approved
			? 'Member approved.'
			: 'Member access revoked.',
	}
}
