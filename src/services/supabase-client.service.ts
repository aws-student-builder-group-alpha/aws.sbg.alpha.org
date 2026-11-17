'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowserClient() {
	if (browserClient) {
		return browserClient
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
	}

	browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
	return browserClient
}
