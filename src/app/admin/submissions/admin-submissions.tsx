'use client'

import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import {
	CalendarRange,
	CircleHelp,
	Copy,
	Download,
	EyeOff,
	ExternalLink,
	FileText,
	Filter,
	History,
	Search,
	Clock3,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	List,
	Layers3,
	ChevronRight,
} from 'lucide-react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import { useAdminTour } from '@/hooks/use-admin-tour'
import { SUBMISSIONS_STEPS } from '@/lib/admin-tour'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { reverifySubmissionAction } from '@/actions/reverify-submission'
import type {
	SubmittedDocumentRow,
	SubmittedDocumentsStats,
} from '@/types/admin.types'

interface AdminSubmissionsProps {
	submissions: SubmittedDocumentRow[]
	stats: SubmittedDocumentsStats
}

type StatusFilter = 'all' | 'pending' | 'verified' | 'failed'
type ViewMode = 'latest' | 'history'

const SUBMISSIONS_TABLE_MIN_WIDTH = 'min-w-[1520px]'

function formatDateTime(value: string | null) {
	if (!value) return '—'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return '—'
	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date)
}

function formatUrlLabel(value: string) {
	try {
		const parsed = new URL(value)
		return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '')
	} catch {
		return value
	}
}

function pairKey(row: SubmittedDocumentRow) {
	return `${row.member.id}:${row.module.id}`
}

function getEligibilityLabel(row: SubmittedDocumentRow) {
	if (row.member.isApproved && row.member.hasAcceptedOath) {
		return 'Approved + oath'
	}
	if (!row.member.isApproved && !row.member.hasAcceptedOath) {
		return 'Pending + oath'
	}
	if (!row.member.isApproved) {
		return 'Pending approval'
	}
	return 'Oath pending'
}

function getStatusMeta(status: SubmittedDocumentRow['verificationStatus']) {
	switch (status) {
		case 'verified':
			return {
				label: 'Verified',
				className:
					'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
				icon: CheckCircle2,
			}
		case 'failed':
			return {
				label: 'Failed',
				className: 'border-red-500/20 bg-red-500/10 text-red-300',
				icon: XCircle,
			}
		default:
			return {
				label: 'Pending',
				className:
					'border-amber-500/20 bg-amber-500/10 text-amber-300',
				icon: Clock3,
			}
	}
}

function getProgressMeta(
	status: 'todo' | 'in-progress' | 'done',
) {
	switch (status) {
		case 'done':
			return {
				label: 'Done',
				className:
					'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
			}
		case 'in-progress':
			return {
				label: 'In progress',
				className:
					'border-[#ff9900]/20 bg-[#ff9900]/10 text-[#ff9900]',
			}
		default:
			return {
				label: 'To do',
				className:
					'border-white/15 bg-white/[0.04] text-white/50',
			}
	}
}

function toDateValue(dateString: string, endOfDay = false) {
	const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00'
	const date = new Date(`${dateString}${suffix}`)
	return Number.isNaN(date.getTime()) ? null : date
}

function isWithinDateRange(
	rowDate: string,
	fromDate: string,
	toDate: string,
) {
	const date = new Date(rowDate)
	if (Number.isNaN(date.getTime())) return false

	if (fromDate) {
		const start = toDateValue(fromDate)
		if (start && date < start) return false
	}

	if (toDate) {
		const end = toDateValue(toDate, true)
		if (end && date > end) return false
	}

	return true
}

function escapeCsvValue(value: string | number | null | undefined) {
	const normalized = value ?? ''
	return `"${String(normalized).replace(/"/g, '""')}"`
}

function buildCsv(rows: SubmittedDocumentRow[]) {
	const header = [
		'member_name',
		'email',
		'role',
		'approved',
		'oath_accepted',
		'category',
		'module',
		'verification_status',
		'verification_reason',
		'submitted_at',
		'verified_at',
		'documentation_url',
		'module_url',
		'progress_status',
		'progress_started_at',
		'progress_completed_at',
	]

	const lines = rows.map((row) =>
		[
			row.member.fullName ?? row.member.email,
			row.member.email,
			row.member.role,
			row.member.isApproved ? 'yes' : 'no',
			row.member.hasAcceptedOath ? 'yes' : 'no',
			row.module.categoryName,
			row.module.title,
			row.verificationStatus,
			row.verificationReason ?? '',
			row.submittedAt,
			row.verifiedAt ?? '',
			row.documentationUrl,
			row.module.nextworkUrl,
			row.progress?.status ?? '',
			row.progress?.startedAt ?? '',
			row.progress?.completedAt ?? '',
		]
			.map(escapeCsvValue)
			.join(','),
	)

	return [header.map(escapeCsvValue).join(','), ...lines].join('\n')
}

function getDefaultViewSummary(
	rows: SubmittedDocumentRow[],
	totalVisibleMembers: number,
) {
	const counts = rows.reduce(
		(acc, row) => {
			acc[row.verificationStatus]++
			return acc
		},
		{
			pending: 0,
			verified: 0,
			failed: 0,
		},
	)

	return [
		{
			label: 'Rows shown',
			value: rows.length,
			subtitle: `${totalVisibleMembers} members`,
			icon: FileText,
		},
		{
			label: 'Verified',
			value: counts.verified,
			subtitle: 'Accepted submissions',
			icon: CheckCircle2,
		},
		{
			label: 'Failed',
			value: counts.failed,
			subtitle: 'Verification misses',
			icon: XCircle,
		},
		{
			label: 'Pending',
			value: counts.pending,
			subtitle: 'Awaiting review',
			icon: Clock3,
		},
	]
}

/**
 * Renders the super-admin submissions review surface.
 */
export default function AdminSubmissions({
	submissions,
	stats,
}: AdminSubmissionsProps) {
	const pageRef = useRef<HTMLDivElement>(null)
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [search, setSearch] = useState('')
	const [statusFilter, setStatusFilter] =
		useState<StatusFilter>('all')
	const [trackFilter, setTrackFilter] = useState('all')
	const [fromDate, setFromDate] = useState('')
	const [toDate, setToDate] = useState('')
	const [includeHiddenUsers, setIncludeHiddenUsers] =
		useState(false)
	const [viewMode, setViewMode] = useState<ViewMode>('latest')
	const [selectedSubmissionId, setSelectedSubmissionId] =
		useState<string | null>(null)
	const [copiedSubmissionId, setCopiedSubmissionId] =
		useState<string | null>(null)
	const [showReverifyDialog, setShowReverifyDialog] =
		useState(false)
	const [reverifyMessage, setReverifyMessage] =
		useState<string | null>(null)

	const steps = useMemo(() => SUBMISSIONS_STEPS, [])
	const { startTour } = useAdminTour(steps)

	useEffect(() => {
		if (!pageRef.current) return
		const rows = Array.from(
			pageRef.current.querySelectorAll('[data-row]'),
		)
		if (rows.length === 0) return

		gsap.set(rows, { opacity: 0, y: 10 })
		gsap.to(rows, {
			opacity: 1,
			y: 0,
			duration: 0.35,
			stagger: 0.025,
			ease: 'power3.out',
			delay: 0.08,
		})
	}, [viewMode, search, statusFilter, trackFilter, fromDate, toDate, includeHiddenUsers])

	const visibleRows = useMemo(
		() =>
			includeHiddenUsers
				? submissions
				: submissions.filter((row) => row.isVisibleByDefault),
		[includeHiddenUsers, submissions],
	)

	const categoryOptions = useMemo(() => {
		const map = new Map<
			string,
			{
				id: string
				name: string
				emoji: string
				order: number
			}
		>()

		for (const row of submissions) {
			const id = row.module.categoryId
			if (!map.has(id)) {
				map.set(id, {
					id,
					name: row.module.categoryName,
					emoji: row.module.categoryEmoji,
					order: row.module.categoryDisplayOrder,
				})
			}
		}

		return Array.from(map.values()).sort(
			(a, b) =>
				a.order - b.order || a.name.localeCompare(b.name),
		)
	}, [submissions])

	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase()

		return visibleRows.filter((row) => {
			if (statusFilter !== 'all' && row.verificationStatus !== statusFilter) {
				return false
			}
			if (trackFilter !== 'all' && row.module.categoryId !== trackFilter) {
				return false
			}
			if (q) {
				const haystack = [
					row.member.fullName ?? '',
					row.member.email,
					row.member.role,
					row.module.title,
					row.module.slug,
					row.module.categoryName,
					row.documentationUrl,
					row.verificationReason ?? '',
				]
					.join(' ')
					.toLowerCase()
				if (!haystack.includes(q)) return false
			}
			if (!isWithinDateRange(row.submittedAt, fromDate, toDate)) {
				return false
			}
			return true
		})
	}, [
		visibleRows,
		search,
		statusFilter,
		trackFilter,
		fromDate,
		toDate,
	])

	const displayRows = useMemo(() => {
		if (viewMode === 'history') {
			return filteredRows
		}

		const seen = new Set<string>()
		const latestRows: SubmittedDocumentRow[] = []

		for (const row of filteredRows) {
			const key = pairKey(row)
			if (seen.has(key)) continue
			seen.add(key)
			latestRows.push(row)
		}

		return latestRows
	}, [filteredRows, viewMode])

	const selectedSubmission = useMemo(
		() =>
			selectedSubmissionId
				? submissions.find(
						(row) => row.submissionId === selectedSubmissionId,
					) ?? null
				: null,
		[selectedSubmissionId, submissions],
	)

	const selectedHistoryRows = useMemo(() => {
		if (!selectedSubmission) return []
		return visibleRows
			.filter(
				(row) =>
					pairKey(row) === pairKey(selectedSubmission),
			)
			.sort(
				(a, b) =>
					new Date(b.submittedAt).getTime() -
					new Date(a.submittedAt).getTime(),
			)
	}, [selectedSubmission, visibleRows])

	useEffect(() => {
		if (!selectedSubmissionId) return
		if (
			!filteredRows.some(
				(row) => row.submissionId === selectedSubmissionId,
			)
		) {
			setSelectedSubmissionId(null)
		}
	}, [selectedSubmissionId, filteredRows])

	const hiddenCount = stats.hiddenSubmissions
	const visibleMemberCount = new Set(
		displayRows.map((row) => row.member.id),
	).size
	const summaryCards = useMemo(
		() => getDefaultViewSummary(displayRows, visibleMemberCount),
		[displayRows, visibleMemberCount],
	)

	function handleResetFilters() {
		setSearch('')
		setStatusFilter('all')
		setTrackFilter('all')
		setFromDate('')
		setToDate('')
		setViewMode('latest')
		setIncludeHiddenUsers(false)
	}

	function handleOpenDocument(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer')
	}

	async function handleCopyDocument(
		row: SubmittedDocumentRow,
	) {
		let copied = false

		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(
					row.documentationUrl,
				)
				copied = true
			}
		} catch {
			copied = false
		}

		if (!copied) {
			try {
				const input =
					document.createElement('textarea')
				input.value = row.documentationUrl
				input.setAttribute('readonly', 'true')
				input.style.position = 'fixed'
				input.style.left = '-9999px'
				input.style.top = '0'
				input.style.opacity = '0'
				document.body.appendChild(input)
				input.focus()
				input.select()
				input.setSelectionRange(0, input.value.length)
				copied = document.execCommand('copy')
				document.body.removeChild(input)
			} catch {
				copied = false
			}
		}

		if (!copied) {
			return
		}

		setCopiedSubmissionId(row.submissionId)
		window.setTimeout(() => {
			setCopiedSubmissionId((current) =>
				current === row.submissionId ? null : current,
			)
		}, 1200)
	}

	function handleExportCsv() {
		const csv = buildCsv(displayRows)
		const blob = new Blob([csv], {
			type: 'text/csv;charset=utf-8;',
		})
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `submitted-documents-${new Date()
			.toISOString()
			.slice(0, 10)}.csv`
		link.click()
		URL.revokeObjectURL(url)
	}

	function handleOpenReverifyDialog() {
		setReverifyMessage(null)
		setShowReverifyDialog(true)
	}

	function handleReverifySubmission() {
		if (!selectedSubmission) return
		startTransition(async () => {
			const result = await reverifySubmissionAction(
				selectedSubmission.submissionId,
			)
			setReverifyMessage(result.message)
			if (result.ok) {
				router.refresh()
			}
		})
	}

	function renderStatusBadge(
		row: SubmittedDocumentRow,
	) {
		const meta = getStatusMeta(row.verificationStatus)
		const Icon = meta.icon

		return (
			<Badge
				variant='outline'
				className={cn(
					'gap-1.5 border px-2 py-1',
					meta.className,
				)}
			>
				<Icon className='h-3 w-3' />
				{meta.label}
			</Badge>
		)
	}

	return (
		<div
			ref={pageRef}
			data-lenis-prevent-wheel={true}
			data-lenis-prevent-touch={true}
			className='overflow-x-auto pb-2'
		>
			<div className='flex flex-col gap-4 mb-8'>
				<div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
					<div>
						<div className='flex items-center gap-3'>
							<h1 className='text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2'>
								<FileText className='w-5 sm:w-6 h-5 sm:h-6 text-[#ff9900]' />
								Submitted Documents
							</h1>
							<button
								type='button'
								onClick={startTour}
								className={cn(
									'inline-flex items-center gap-1.5',
									'rounded-lg px-3 py-1.5',
									'text-xs font-medium',
									'text-white/30 hover:text-[#ff9900]',
									'hover:bg-[#ff9900]/[0.06]',
									'border border-white/[0.06]',
									'hover:border-[#ff9900]/20',
									'transition-all',
								)}
							>
								<CircleHelp className='w-3.5 h-3.5' />
								Need a guide?
							</button>
						</div>
						<p className='text-xs sm:text-sm text-white/40 mt-1'>
							{displayRows.length} rows shown
							<span className='text-white/20 mx-2'>
								•
							</span>
							{filteredRows.length} attempts matched
							<span className='text-white/20 mx-2'>
								•
							</span>
							{hiddenCount} hidden by default
						</p>
					</div>

					<div className='flex flex-wrap items-center gap-2'>
						<div className='inline-flex rounded-xl border border-white/[0.06] bg-white/[0.03] p-1'>
							<button
								type='button'
								onClick={() => setViewMode('latest')}
								className={cn(
									'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
									viewMode === 'latest'
										? 'bg-[#ff9900] text-white'
										: 'text-white/60 hover:text-white',
								)}
								>
								<List className='h-4 w-4' />
								Latest
							</button>
							<button
								type='button'
								onClick={() => setViewMode('history')}
								className={cn(
									'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
									viewMode === 'history'
										? 'bg-[#ff9900] text-white'
										: 'text-white/60 hover:text-white',
								)}
							>
								<History className='h-4 w-4' />
								History
							</button>
						</div>

						<Button
							type='button'
							variant='outline'
							onClick={handleExportCsv}
							className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
						>
							<Download className='h-4 w-4' />
							Export CSV
						</Button>
					</div>
				</div>

				<div
					data-tour='submissions-summary'
					className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'
				>
					{summaryCards.map((card) => {
						const Icon = card.icon
						return (
							<div
								key={card.label}
								className={cn(
									'rounded-2xl p-4',
									'border border-white/[0.06]',
									'bg-white/[0.02]',
								)}
							>
								<div className='flex items-center justify-between gap-3 mb-4'>
									<p className='text-sm text-white/45'>
										{card.label}
									</p>
									<Icon className='h-4 w-4 text-[#ff9900]' />
								</div>
								<p className='text-3xl font-bold tracking-tight text-white'>
									{card.value}
								</p>
								<p className='text-xs text-white/30 mt-2'>
									{card.subtitle}
								</p>
							</div>
						)
					})}
				</div>
			</div>

			<div
				data-tour='submissions-controls'
				className={cn(
					'rounded-2xl p-4 sm:p-5 mb-6',
					'border border-white/[0.06]',
					'bg-white/[0.02]',
				)}
			>
				<div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
					<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:flex-1'>
						<div className='relative xl:col-span-2'>
							<Search className='pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20' />
							<input
								type='text'
								value={search}
								onChange={(e) =>
									setSearch(e.target.value)
								}
								placeholder='Search by member, email, module, track, or URL...'
								className={cn(
									'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all',
									'focus:border-[#ff9900]/40',
								)}
							/>
						</div>

						<div className='relative'>
							<Filter className='pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20' />
							<select
								value={statusFilter}
								onChange={(e) =>
									setStatusFilter(
										e.target.value as StatusFilter,
									)
								}
								className={cn(
									'w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-all',
									'focus:border-[#ff9900]/40',
								)}
							>
								<option value='all'>All statuses</option>
								<option value='pending'>Pending</option>
								<option value='verified'>Verified</option>
								<option value='failed'>Failed</option>
							</select>
						</div>

						<div className='relative'>
							<Layers3 className='pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20' />
							<select
								value={trackFilter}
								onChange={(e) =>
									setTrackFilter(e.target.value)
								}
								className={cn(
									'w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-all',
									'focus:border-[#ff9900]/40',
								)}
							>
								<option value='all'>All tracks</option>
								{categoryOptions.map((category) => (
									<option
										key={category.id}
										value={category.id}
									>
										{category.emoji} {category.name}
									</option>
								))}
							</select>
						</div>

						<div className='grid grid-cols-2 gap-2'>
							<div className='relative'>
								<CalendarRange className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20' />
								<input
									type='date'
									value={fromDate}
									onChange={(e) =>
										setFromDate(e.target.value)
									}
									className={cn(
										'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 py-2.5 text-sm text-white outline-none transition-all',
										'focus:border-[#ff9900]/40',
									)}
								/>
							</div>
							<div className='relative'>
								<CalendarRange className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20' />
								<input
									type='date'
									value={toDate}
									onChange={(e) =>
										setToDate(e.target.value)
									}
									className={cn(
										'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 py-2.5 text-sm text-white outline-none transition-all',
										'focus:border-[#ff9900]/40',
									)}
								/>
							</div>
						</div>
					</div>

					<div className='flex flex-wrap items-center gap-4'>
						<div className='flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5'>
							<div className='flex flex-col'>
								<span className='text-sm font-medium text-white'>
									Include hidden users
								</span>
								<span className='text-[11px] text-white/30'>
									Show pending and oath-incomplete
									members
								</span>
							</div>
							<Switch
								checked={includeHiddenUsers}
								onCheckedChange={setIncludeHiddenUsers}
							/>
						</div>

						<Button
							type='button'
							variant='outline'
							onClick={handleResetFilters}
							className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
						>
							<EyeOff className='h-4 w-4' />
							Reset filters
						</Button>
					</div>
				</div>
			</div>

			{!includeHiddenUsers && hiddenCount > 0 && (
				<div className='mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-start gap-3'>
					<AlertTriangle className='h-4 w-4 shrink-0 mt-0.5 text-amber-300' />
					<p>
						{hiddenCount} submission
						{hiddenCount === 1 ? '' : 's'} are hidden by
						default because the member is not both approved
						and oath-complete.
					</p>
				</div>
			)}

			<div
				data-tour='submissions-table'
				className={cn(
					'w-max min-w-full rounded-2xl overflow-hidden',
					'border border-white/[0.06]',
					'bg-white/[0.02]',
				)}
			>
				<div className='flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3'>
					<div className='flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/25 font-semibold'>
						<FileText className='h-4 w-4 text-[#ff9900]' />
						{submissions.length} total attempts
					</div>
					<div className='text-right'>
						<p className='text-xs text-white/30'>
							{viewMode === 'latest'
								? 'Latest submission per member-module pair'
								: 'Every submission attempt'}
						</p>
						<p className='text-[11px] text-white/20'>
							Scroll horizontally to reveal the full row.
							Action buttons stay pinned on the right.
						</p>
					</div>
				</div>

				{displayRows.length === 0 ? (
					<div className='px-6 py-16 text-center'>
						<p className='text-lg font-semibold text-white'>
							No submissions found.
						</p>
						<p className='text-sm text-white/35 mt-2'>
							Try clearing filters or showing hidden
							users.
						</p>
					</div>
				) : (
					<>
						{/* Desktop table */}
						<div className='hidden xl:block'>
							<Table
								nestedScroll={false}
								className={cn(
									SUBMISSIONS_TABLE_MIN_WIDTH,
									'w-max table-auto',
								)}
							>
								<TableHeader>
									<TableRow className='border-white/[0.06] hover:bg-transparent'>
										<TableHead className='pl-5 text-white/35'>
											Member
										</TableHead>
										<TableHead className='text-white/35'>
											Track
										</TableHead>
										<TableHead className='text-white/35'>
											Module
										</TableHead>
										<TableHead className='text-white/35'>
											URL
										</TableHead>
										<TableHead className='text-white/35'>
											Status
										</TableHead>
										<TableHead className='text-white/35'>
											Submitted
										</TableHead>
										<TableHead className='text-white/35'>
											Verified
										</TableHead>
										<TableHead className='sticky right-0 z-30 bg-[#11131a] pr-5 text-right text-white/35 shadow-[-16px_0_24px_-20px_rgba(0,0,0,0.75)]'>
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{displayRows.map((row) => {
										const copied =
											copiedSubmissionId ===
											row.submissionId

										return (
											<TableRow
												key={row.submissionId}
												data-row
												className='group border-white/[0.04] hover:bg-white/[0.03]'
											>
												<TableCell className='pl-5'>
													<div className='space-y-1.5'>
														<div className='flex flex-wrap items-center gap-2'>
															<p className='font-medium text-white'>
																{row.member.fullName ??
																	row.member.email}
															</p>
															{!row.isVisibleByDefault && (
																<Badge
																	variant='outline'
																	className='border-amber-500/20 bg-amber-500/10 text-amber-300'
																>
																	Hidden
																</Badge>
															)}
															<Badge
																variant='outline'
																className={cn(
																	'border-white/10 bg-white/[0.03] text-white/45',
																)}
															>
																{getEligibilityLabel(
																	row,
																)}
															</Badge>
														</div>
														<p className='text-[11px] text-white/30'>
															{row.member.email}
														</p>
													</div>
												</TableCell>
												<TableCell>
													<div className='space-y-1'>
														<p className='text-sm text-white'>
															{row.module.categoryEmoji}{' '}
															{row.module.categoryName}
														</p>
														<p className='text-[11px] text-white/30'>
															{row.member.role}
														</p>
													</div>
												</TableCell>
												<TableCell>
													<div className='space-y-1'>
														<p className='text-sm text-white'>
															{row.module.title}
														</p>
														<p className='text-[11px] text-white/30'>
															{row.progress?.status
																? getProgressMeta(
																		row.progress.status,
																	).label
																: 'No progress record'}
														</p>
													</div>
												</TableCell>
												<TableCell>
													<div className='flex max-w-[280px] items-center gap-2'>
														<p className='truncate text-sm text-white/70'>
															{formatUrlLabel(
																row.documentationUrl,
															)}
														</p>
														<Button
															type='button'
															variant='outline'
															size='icon-sm'
															onClick={() =>
																handleCopyDocument(
																	row,
																)
															}
															className={cn(
																'shrink-0 border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]',
																copied &&
																	'border-emerald-400/30 text-emerald-300',
															)}
															aria-label='Copy submission URL'
															title='Copy submission URL'
														>
															<Copy className='h-4 w-4' />
														</Button>
													</div>
												</TableCell>
												<TableCell>
													{renderStatusBadge(row)}
												</TableCell>
												<TableCell className='text-sm text-white/65'>
													{formatDateTime(row.submittedAt)}
												</TableCell>
												<TableCell className='text-sm text-white/65'>
													{formatDateTime(row.verifiedAt)}
												</TableCell>
												<TableCell className='sticky right-0 z-20 pr-5 bg-[#11131a] shadow-[-16px_0_24px_-20px_rgba(0,0,0,0.75)] group-hover:bg-white/[0.03]'>
													<div className='flex items-center justify-end gap-2'>
														<Button
															type='button'
															variant='outline'
															size='sm'
															onClick={() =>
																handleOpenDocument(
																	row.documentationUrl,
																)
															}
															className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
														>
															<ExternalLink className='h-3.5 w-3.5' />
															Open
														</Button>
														<Button
															type='button'
															variant='outline'
															size='sm'
															onClick={() =>
																setSelectedSubmissionId(
																	row.submissionId,
																)
															}
															className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
														>
															<ChevronRight className='h-3.5 w-3.5' />
															Details
														</Button>
														<Button
															type='button'
															variant='outline'
															size='sm'
															onClick={() =>
																handleCopyDocument(
																	row,
																)
															}
															className={cn(
																'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]',
																copied &&
																	'border-emerald-400/30 text-emerald-300',
															)}
														>
															<Copy className='h-3.5 w-3.5' />
															{copied
																? 'Copied'
																: 'Copy URL'}
														</Button>
													</div>
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</div>

						{/* Mobile cards */}
						<div className='space-y-3 p-4 xl:hidden'>
							{displayRows.map((row) => {
								const copied =
									copiedSubmissionId === row.submissionId

								return (
									<div
										key={row.submissionId}
										data-row
										className={cn(
											'rounded-2xl p-4',
											'border border-white/[0.06]',
											'bg-white/[0.02]',
										)}
									>
										<div className='flex items-start justify-between gap-3 mb-3'>
											<div className='min-w-0'>
												<div className='flex flex-wrap items-center gap-2'>
													<p className='text-sm font-semibold text-white'>
														{row.member.fullName ??
															row.member.email}
													</p>
													{!row.isVisibleByDefault && (
														<Badge
															variant='outline'
															className='border-amber-500/20 bg-amber-500/10 text-amber-300'
														>
															Hidden
														</Badge>
													)}
												</div>
												<p className='text-xs text-white/30 mt-1 break-all'>
													{row.member.email}
												</p>
											</div>
											{renderStatusBadge(row)}
										</div>

										<div className='grid gap-3 text-sm text-white/65'>
											<div>
												<p className='text-[11px] uppercase tracking-[0.15em] text-white/25 mb-1'>
													Track
												</p>
												<p>
													{row.module.categoryEmoji}{' '}
													{row.module.categoryName}
												</p>
											</div>
											<div>
												<p className='text-[11px] uppercase tracking-[0.15em] text-white/25 mb-1'>
													Module
												</p>
												<p className='text-white'>
													{row.module.title}
												</p>
											</div>
											<div>
												<p className='text-[11px] uppercase tracking-[0.15em] text-white/25 mb-1'>
													URL
												</p>
												<p className='break-all text-white/70'>
													{row.documentationUrl}
												</p>
											</div>
											<div className='grid grid-cols-2 gap-3'>
												<div>
													<p className='text-[11px] uppercase tracking-[0.15em] text-white/25 mb-1'>
														Submitted
													</p>
													<p className='text-white/70'>
														{formatDateTime(
															row.submittedAt,
														)}
													</p>
												</div>
												<div>
													<p className='text-[11px] uppercase tracking-[0.15em] text-white/25 mb-1'>
														Verified
													</p>
													<p className='text-white/70'>
														{formatDateTime(
															row.verifiedAt,
														)}
													</p>
												</div>
											</div>
										</div>

										<div className='mt-4 flex flex-wrap gap-2'>
											<Button
												type='button'
												variant='outline'
												size='sm'
												onClick={() =>
													handleOpenDocument(
														row.documentationUrl,
													)
												}
												className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
											>
												<ExternalLink className='h-3.5 w-3.5' />
												Open
											</Button>
											<Button
												type='button'
												variant='outline'
												size='sm'
												onClick={() =>
													setSelectedSubmissionId(
														row.submissionId,
													)
												}
												className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
											>
												<ChevronRight className='h-3.5 w-3.5' />
												Details
											</Button>
											<Button
												type='button'
												variant='outline'
												size='sm'
												onClick={() =>
													handleCopyDocument(row)
												}
												className={cn(
													'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]',
													copied &&
														'border-emerald-400/30 text-emerald-300',
												)}
											>
												<Copy className='h-3.5 w-3.5' />
												{copied ? 'Copied' : 'Copy URL'}
											</Button>
										</div>
									</div>
								)
							})}
						</div>
					</>
				)}
			</div>

			<Sheet
				open={Boolean(selectedSubmission)}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedSubmissionId(null)
					}
				}}
			>
				<SheetContent
					side='right'
					className='overflow-y-auto bg-[#12131a] text-white border-white/[0.06] shadow-2xl'
				>
					{selectedSubmission && (
						<>
							<SheetHeader className='border-b border-white/[0.06] pb-4'>
								<SheetTitle className='text-white text-xl'>
									{submittedRowTitle(selectedSubmission)}
								</SheetTitle>
								<SheetDescription className='text-white/45'>
									{selectedSubmission.member.email} •{' '}
									{selectedSubmission.module.categoryName}
								</SheetDescription>
							</SheetHeader>

							<div className='space-y-5 px-4 pb-4 pt-2'>
								<div className='rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-4'>
									<div className='flex flex-wrap items-center gap-2'>
										{renderStatusBadge(selectedSubmission)}
										<Badge
											variant='outline'
											className='border-white/10 bg-white/[0.03] text-white/45'
										>
											{selectedSubmission.member.role}
										</Badge>
										{!selectedSubmission.isVisibleByDefault && (
											<Badge
												variant='outline'
												className='border-amber-500/20 bg-amber-500/10 text-amber-300'
											>
												Hidden by default
											</Badge>
										)}
									</div>

									<div className='space-y-2'>
										<p className='text-xs uppercase tracking-[0.18em] text-white/25'>
											Member
										</p>
										<p className='text-white font-medium'>
											{selectedSubmission.member.fullName ??
												selectedSubmission.member.email}
										</p>
										<p className='text-sm text-white/40 break-all'>
											{selectedSubmission.member.email}
										</p>
										<p className='text-sm text-white/45'>
											{getEligibilityLabel(
												selectedSubmission,
											)}
										</p>
									</div>

									<div className='space-y-2'>
										<p className='text-xs uppercase tracking-[0.18em] text-white/25'>
											Module
										</p>
										<p className='text-white font-medium'>
											{selectedSubmission.module.categoryEmoji}{' '}
											{selectedSubmission.module.categoryName}
										</p>
										<p className='text-sm text-white/40'>
											{selectedSubmission.module.title}
										</p>
									</div>
								</div>

								<div className='rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3'>
									<div className='flex items-center justify-between gap-3'>
										<p className='text-sm font-medium text-white'>
											Submission URL
										</p>
										<div className='flex items-center gap-2'>
											<Button
												type='button'
												variant='outline'
												size='sm'
												onClick={() =>
													handleOpenDocument(
														selectedSubmission.documentationUrl,
													)
												}
												className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
											>
												<ExternalLink className='h-3.5 w-3.5' />
												Open
											</Button>
											<Button
												type='button'
												variant='outline'
												size='sm'
												onClick={() =>
													handleCopyDocument(
														selectedSubmission,
													)
												}
												className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
											>
												<Copy className='h-3.5 w-3.5' />
												Copy URL
											</Button>
										</div>
									</div>
									<p className='break-all rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-white/70'>
										{selectedSubmission.documentationUrl}
									</p>
									{copiedSubmissionId ===
										selectedSubmission.submissionId && (
										<p className='text-xs text-emerald-300'>
											URL copied to clipboard.
										</p>
									)}
								</div>

								<div className='grid gap-3 sm:grid-cols-2'>
									<div className='rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4'>
										<p className='text-xs uppercase tracking-[0.18em] text-white/25 mb-2'>
											Verification
										</p>
										<div className='flex items-center gap-2 mb-2'>
											{renderStatusBadge(
												selectedSubmission,
											)}
										</div>
										<p className='text-sm text-white/55 break-words'>
											{selectedSubmission.verificationReason ??
												'No verification reason stored.'}
										</p>
									</div>

									<div className='rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-2'>
										<p className='text-xs uppercase tracking-[0.18em] text-white/25'>
											Timestamps
										</p>
										<div className='space-y-2 text-sm text-white/55'>
											<p>
												Submitted:{' '}
												{formatDateTime(
													selectedSubmission.submittedAt,
												)}
											</p>
											<p>
												Verified:{' '}
												{formatDateTime(
													selectedSubmission.verifiedAt,
												)}
											</p>
											<p>
												Updated:{' '}
												{formatDateTime(
													selectedSubmission.updatedAt,
												)}
											</p>
										</div>
									</div>
								</div>

								<div className='rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4'>
									<div className='flex items-center justify-between gap-3 mb-3'>
										<div>
											<p className='text-sm font-medium text-white'>
												Attempt history
											</p>
											<p className='text-xs text-white/35'>
												{selectedHistoryRows.length} attempt
												{selectedHistoryRows.length === 1
													? ''
													: 's'} for this member-module
												pair.
											</p>
										</div>
										<History className='h-4 w-4 text-[#ff9900]' />
									</div>

									<div className='space-y-3'>
										{selectedHistoryRows.map((row, idx) => (
											<div
												key={row.submissionId}
												className='rounded-xl border border-white/[0.06] bg-black/20 p-3'
											>
												<div className='flex flex-wrap items-center justify-between gap-2 mb-2'>
													<div className='flex items-center gap-2'>
														<Badge
															variant='outline'
															className='border-white/10 bg-white/[0.03] text-white/45'
														>
															Attempt {idx + 1}
														</Badge>
														{renderStatusBadge(row)}
													</div>
													<p className='text-xs text-white/30'>
														{formatDateTime(
															row.submittedAt,
														)}
													</p>
												</div>
												<p className='text-sm text-white/65 break-all'>
													{formatUrlLabel(
														row.documentationUrl,
													)}
												</p>
												{row.verificationReason && (
													<p className='mt-2 text-xs text-white/35'>
														{row.verificationReason}
													</p>
												)}
											</div>
										))}
									</div>
								</div>

								<div className='rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-2'>
									<p className='text-xs uppercase tracking-[0.18em] text-white/25'>
										Progress state
									</p>
									{selectedSubmission.progress ? (
										<div className='flex flex-wrap items-center gap-2'>
											<Badge
												variant='outline'
												className={cn(
													'border px-2 py-1',
													getProgressMeta(
														selectedSubmission.progress.status,
													).className,
												)}
											>
												{getProgressMeta(
													selectedSubmission.progress.status,
												).label}
											</Badge>
											<span className='text-sm text-white/45'>
												Started{' '}
												{formatDateTime(
													selectedSubmission.progress.startedAt,
												)}
											</span>
										</div>
									) : (
										<p className='text-sm text-white/45'>
											No progress row found for this
											member and module.
										</p>
									)}
								</div>

								<div className='rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3'>
									<div className='flex items-center justify-between gap-3'>
										<div>
											<p className='text-sm font-medium text-white'>
												Re-check submission
											</p>
											<p className='text-xs text-white/35'>
												Run the automatic verifier again
												against the current URL.
											</p>
										</div>
										<Button
											type='button'
											variant='outline'
											onClick={handleOpenReverifyDialog}
											disabled={isPending}
											className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
										>
											<History className='h-3.5 w-3.5' />
											{isPending
												? 'Verifying...'
												: 'Re-run verification'}
										</Button>
									</div>
									{reverifyMessage && (
										<p className='text-xs text-white/45 break-words'>
											{reverifyMessage}
										</p>
									)}
								</div>
							</div>

							<SheetFooter className='border-t border-white/[0.06] px-4 py-4'>
								<Button
									type='button'
									variant='outline'
									onClick={() =>
										setSelectedSubmissionId(null)
									}
									className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
								>
									Close
								</Button>
							</SheetFooter>
						</>
					)}
				</SheetContent>
			</Sheet>

			<AlertDialog
				open={showReverifyDialog}
				onOpenChange={setShowReverifyDialog}
			>
				<AlertDialogContent className='bg-[#12131a] border-white/[0.06] text-white'>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Re-run verification?
						</AlertDialogTitle>
						<AlertDialogDescription className='text-white/45'>
							This will re-check the current documentation
							URL for{' '}
							{selectedSubmission
								? submittedRowTitle(selectedSubmission)
								: 'the selected submission'}
							and update the status row if the result changes.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className='border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white'>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleReverifySubmission}
							className='bg-[#ff9900] text-white hover:bg-[#e68900]'
						>
							Run verification
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

function submittedRowTitle(row: SubmittedDocumentRow) {
	return row.member.fullName ?? row.member.email
}
