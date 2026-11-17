'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/services/supabase-client.service'

export default function AcceptInvitePage() {
	const router = useRouter()
	const [password, setPassword] = useState('')
	const [fullName, setFullName] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)
		setIsLoading(true)

		try {
			const supabase = getSupabaseBrowserClient()
			const { data: userData } = await supabase.auth.getUser()
			if (!userData.user) {
				setError('Invite session not found. Open the invite link from your email again.')
				return
			}

			const { error: userUpdateError } = await supabase.auth.updateUser({
				password,
				data: {
					full_name: fullName.trim() || null,
				},
			})

			if (userUpdateError) {
				setError(userUpdateError.message)
				return
			}

			if (fullName.trim().length > 0) {
				await supabase
					.from('profiles')
					.update({ full_name: fullName.trim() })
					.eq('id', userData.user.id)
			}

			setIsSuccess(true)
			router.replace('/skillbuilder')
			router.refresh()
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<main className='min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4'>
			<div className='w-full max-w-md rounded-xl border bg-white p-6 shadow-sm'>
				<h1 className='text-2xl font-bold text-[#232f3e]'>Complete your invite</h1>
				<p className='mt-2 text-sm text-muted-foreground'>
					Set your profile details and password to access Skillbuilder.
				</p>

				<form className='mt-6 space-y-4' onSubmit={handleSubmit}>
					<div className='space-y-1'>
						<label className='text-sm font-medium' htmlFor='full-name'>
							Full name
						</label>
						<input
							id='full-name'
							type='text'
							value={fullName}
							onChange={(event) => setFullName(event.target.value)}
							className='w-full rounded-md border px-3 py-2 outline-none ring-0 focus:border-[#ff9900]'
							placeholder='Juan Dela Cruz'
						/>
					</div>

					<div className='space-y-1'>
						<label className='text-sm font-medium' htmlFor='password'>
							New password
						</label>
						<input
							id='password'
							type='password'
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className='w-full rounded-md border px-3 py-2 outline-none ring-0 focus:border-[#ff9900]'
							minLength={8}
							required
						/>
					</div>

					{error && (
						<p className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
							{error}
						</p>
					)}

					{isSuccess && (
						<p className='rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'>
							Invite completed. Redirecting...
						</p>
					)}

					<button
						type='submit'
						disabled={isLoading}
						className='w-full rounded-md bg-[#ff9900] py-2.5 text-sm font-semibold text-white hover:bg-[#e68900] disabled:opacity-70'
					>
						{isLoading ? 'Saving...' : 'Activate account'}
					</button>
				</form>
			</div>
		</main>
	)
}
