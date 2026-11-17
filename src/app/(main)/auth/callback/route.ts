import { getAppOrigin } from '@/recruitment/lib/supabase/config'
import { cookies } from 'next/headers'
import { authReturnPath } from '@/recruitment/lib/auth-return'
import { recruitmentPath } from '@/recruitment/lib/site-paths'
import { memberEntry } from '@/recruitment/lib/member-entry'
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/services/supabase-server.service'
import { getSupabaseAdminClient } from '@/services/supabase-admin.service'

export async function GET(request: Request) {
	const requestUrl = new URL(request.url)
	const code = requestUrl.searchParams.get('code')
	const requestedNext = requestUrl.searchParams.get('next')
	const next = requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//') && !requestedNext.includes('\\') && new URL(requestedNext, getAppOrigin()).origin === getAppOrigin() ? requestedNext : null
	const store = await cookies()
	const recruitmentDestination = store.get('alpha-auth-destination')?.value
	const opportunity = store.get('alpha-opportunity')?.value
	store.delete('alpha-auth-destination')
	store.delete('alpha-opportunity')
	const failure = recruitmentDestination ? recruitmentPath(authReturnPath(recruitmentDestination === 'staff' ? 'staff' : recruitmentDestination === 'membership' ? 'membership' : 'apply', opportunity, 'failed')) : '/auth/login'

	if (!code) {
		return NextResponse.redirect(
			new URL(failure, getAppOrigin()), { headers: { "Cache-Control": "private, no-store" } },
		)
	}

	const supabase = await getSupabaseServerClient()
	const { error } = await supabase.auth.exchangeCodeForSession(code).catch(() => ({ error: new Error('Exchange failed') }))

	if (error) {
		return NextResponse.redirect(
			new URL(failure, getAppOrigin()), { headers: { "Cache-Control": "private, no-store" } },
		)
	}

	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.redirect(
			new URL(failure, getAppOrigin()), { headers: { "Cache-Control": "private, no-store" } },
		)
	}


	const userEmail = user.email?.toLowerCase() ?? ''

	// Auto-create profile if it doesn't exist yet
	const supabaseAdmin = getSupabaseAdminClient()
	const { data: existingProfile } = await supabaseAdmin
		.from('profiles')
		.select('id, is_approved')
		.eq('id', user.id)
		.maybeSingle()

	const superAdminEmails = (
		process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL ?? ''
	)
		.toLowerCase()
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean)

	const isSuperAdmin = superAdminEmails.includes(userEmail)

	const authName =
		user.user_metadata?.full_name ??
		user.user_metadata?.name ??
		null
	const authAvatar =
		user.user_metadata?.avatar_url ??
		user.user_metadata?.picture ??
		null

	if (!existingProfile) {
		// First sign-in: create profile
		// Super-admins are auto-approved, members are not
		await supabaseAdmin.from('profiles').insert({
			id: user.id,
			email: userEmail,
			full_name: authName,
			avatar_url: authAvatar,
			role: isSuperAdmin ? 'super-admin' : 'member',
			is_approved: isSuperAdmin,
		})
	} else {
		// Returning user: sync name/avatar from Google
		// if profile is still missing them
		const updates: { full_name?: string; avatar_url?: string } = {}
		if (authName) updates.full_name = authName
		if (authAvatar) updates.avatar_url = authAvatar

		if (Object.keys(updates).length > 0) {
			await supabaseAdmin
				.from('profiles')
				.update(updates)
				.eq('id', user.id)
				.is('full_name', null)
		}
	}

	if (recruitmentDestination) {
		const destination = recruitmentDestination === 'staff' ? 'staff' : recruitmentDestination === 'membership' ? 'membership' : 'apply'
		const path = destination === 'apply' && await memberEntry(supabase as unknown as Parameters<typeof memberEntry>[0]) === 'membership' ? '/membership' : authReturnPath(destination, opportunity)
		return NextResponse.redirect(new URL(recruitmentPath(path), getAppOrigin()), { headers: { 'Cache-Control': 'private, no-store' } })
	}

	// Explicit next param takes priority
	if (next) {
		return NextResponse.redirect(
			new URL(next, getAppOrigin()),
		)
	}

	// Route by role
	const destination = isSuperAdmin
		? '/admin'
		: '/skillbuilder/dashboard'

	return NextResponse.redirect(
		new URL(destination, getAppOrigin()),
	)
}
