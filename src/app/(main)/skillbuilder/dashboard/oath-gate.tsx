'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import OathModal from '@/components/oath-modal'

const BLOCKED_KEYS = new Set([
	'F12',
	'f12',
])

const BLOCKED_COMBOS: Array<{
	ctrl?: boolean
	shift?: boolean
	key: string
}> = [
	{ ctrl: true, shift: true, key: 'i' },
	{ ctrl: true, shift: true, key: 'I' },
	{ ctrl: true, shift: true, key: 'j' },
	{ ctrl: true, shift: true, key: 'J' },
	{ ctrl: true, shift: true, key: 'c' },
	{ ctrl: true, shift: true, key: 'C' },
	{ ctrl: true, key: 'u' },
	{ ctrl: true, key: 'U' },
]

export default function OathGate() {
	const router = useRouter()

	useEffect(() => {
		function blockShortcuts(e: KeyboardEvent) {
			if (BLOCKED_KEYS.has(e.key)) {
				e.preventDefault()
				return
			}

			const ctrl = e.ctrlKey || e.metaKey
			for (const combo of BLOCKED_COMBOS) {
				if (
					combo.ctrl === ctrl &&
					(!combo.shift || e.shiftKey) &&
					e.key === combo.key
				) {
					e.preventDefault()
					return
				}
			}
		}

		function blockContextMenu(e: MouseEvent) {
			e.preventDefault()
		}

		document.addEventListener(
			'keydown',
			blockShortcuts,
			true,
		)
		document.addEventListener(
			'contextmenu',
			blockContextMenu,
			true,
		)

		return () => {
			document.removeEventListener(
				'keydown',
				blockShortcuts,
				true,
			)
			document.removeEventListener(
				'contextmenu',
				blockContextMenu,
				true,
			)
		}
	}, [])

	// MutationObserver: if modal is removed from DOM,
	// force a full page reload to re-render from server
	useEffect(() => {
		const observer = new MutationObserver(() => {
			const modal = document.querySelector(
				'[data-oath-modal]',
			)
			if (!modal) {
				window.location.reload()
			}
		})

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		})

		return () => observer.disconnect()
	}, [])

	function handleAccepted() {
		router.refresh()
	}

	return (
		<div
			data-oath-modal
			className='min-h-screen bg-[#0d1117]'
		>
			<OathModal onAccepted={handleAccepted} />
		</div>
	)
}
