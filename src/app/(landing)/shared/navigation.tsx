"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import {
	ChevronDown,
	LogOut,
	Menu,
	Settings,
	Shield,
	X,
} from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/services/supabase-client.service"
import SignOutModal from "@/components/sign-out-modal"
import { RECRUITMENT_URL, COMBINED_SITE } from "@/lib/recruitment"
import { MAIN_SECTION_LINKS, MAIN_PAGE_LINKS } from "@/lib/navigation"

interface NavigationProps {
	initialAuth?: {
		authenticated: boolean
		label: string
		role?: string
	}
}

export default function Navigation({
	initialAuth,
}: NavigationProps = {}) {
	const pathname = usePathname()
	const [isScrolled, setIsScrolled] = useState(false)
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [activeSection, setActiveSection] = useState("")
	const [isDarkSection, setIsDarkSection] = useState(false)
	const [isAuthenticated, setIsAuthenticated] = useState(
		initialAuth?.authenticated ?? false,
	)
	const [accountLabel, setAccountLabel] = useState(
		initialAuth?.label ?? "Account",
	)
	const [isAdmin, setIsAdmin] = useState(
		initialAuth?.role === 'admin' ||
			initialAuth?.role === 'super-admin',
	)
	const [isAccountOpen, setIsAccountOpen] = useState(false)
	const [showSignOutModal, setShowSignOutModal] = useState(false)
	const [isSigningOut, setIsSigningOut] = useState(false)
	const navRef = useRef<HTMLElement>(null)
	const accountRef = useRef<HTMLDivElement>(null)
	const [recruitmentSignedIn, setRecruitmentSignedIn] = useState<boolean | null>(null)
	const [signOutError, setSignOutError] = useState('')
	const pageLinks = COMBINED_SITE && recruitmentSignedIn ? [{ href: '/recruitment/application?resume=1', label: 'My application' }] : MAIN_PAGE_LINKS

	const mobileLinks = [...MAIN_SECTION_LINKS, ...pageLinks]
	useEffect(() => {
		if (!COMBINED_SITE) return
		const controller = new AbortController()
		const check = async () => {
			try {
				const response = await fetch('/recruitment/api/community/session', { cache: 'no-store', signal: controller.signal })
				const result = await response.json()
				if (response.ok && result.ok && typeof result.data?.signedIn === 'boolean') setRecruitmentSignedIn(result.data.signedIn)
			} catch { /* Keep the navigation usable if verification is unavailable. */ }
		}
		void check()
		window.addEventListener('focus', check)
		return () => { controller.abort(); window.removeEventListener('focus', check) }
	}, [])
	async function signOutRecruitment() {
		setIsSigningOut(true); setSignOutError('')
		try {
			const response = await fetch('/recruitment/api/community/session', { method: 'POST' })
			if (!response.ok) throw new Error()
			window.location.assign('/')
		} catch { setSignOutError('Sign-out could not be confirmed. Retry.'); setIsSigningOut(false) }
	}

	useEffect(() => {
		gsap.registerPlugin(ScrollTrigger)
	}, [])

	useEffect(() => {
		if (COMBINED_SITE) return
		const supabase = getSupabaseBrowserClient()

		const fetchProfile = async (
			email: string | null | undefined,
			userId: string | null | undefined,
		) => {
			if (!email || !userId) {
				return { label: "Account", admin: false }
			}
			const baseName = email.split("@")[0] || "Account"
			const { data } = await supabase
				.from("profiles")
				.select("full_name, role")
				.eq("id", userId)
				.maybeSingle()
			const fullName = data?.full_name?.trim()
			const label =
				fullName && fullName.length > 0
					? fullName
					: baseName
			const admin =
				data?.role === "admin" ||
				data?.role === "super-admin"
			return { label, admin }
		}

		const loadSession = async () => {
			const { data: { user } } = await supabase.auth.getUser()
			setIsAuthenticated(Boolean(user))
			if (user) {
				const profile = await fetchProfile(
					user.email,
					user.id,
				)
				setAccountLabel(profile.label)
				setIsAdmin(profile.admin)
			} else {
				setAccountLabel("Account")
				setIsAdmin(false)
			}
		}

		void loadSession()

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (_event, session) => {
			setIsAuthenticated(Boolean(session))
			if (session?.user) {
				const profile = await fetchProfile(
					session.user.email,
					session.user.id,
				)
				setAccountLabel(profile.label)
				setIsAdmin(profile.admin)
			} else {
				setAccountLabel("Account")
				setIsAdmin(false)
			}
		})

		return () => {
			subscription.unsubscribe()
		}
	}, [])

	useEffect(() => {
		const darkSections = [...document.querySelectorAll('[data-theme="dark"]')]
		let frame = 0
		const update = () => {
			frame = 0
			setIsScrolled(window.scrollY > 20)
			const navHeight = navRef.current?.offsetHeight ?? 80
			setIsDarkSection(darkSections.some(section => {
				const rect = section.getBoundingClientRect()
				return rect.top <= navHeight && rect.bottom >= navHeight
			}))
		}
		const handleScroll = () => {
			if (!frame) frame = requestAnimationFrame(update)
		}
		frame = requestAnimationFrame(update)
		window.addEventListener("scroll", handleScroll, {
			passive: true,
		})
		window.addEventListener("resize", handleScroll)
		return () => {
			cancelAnimationFrame(frame)
			window.removeEventListener("scroll", handleScroll)
			window.removeEventListener("resize", handleScroll)
		}
	}, [pathname])

	useEffect(() => {
		if (!navRef.current) return

		let lastDirection = -1
		const ctx = gsap.context(() => {
			ScrollTrigger.create({
				start: "top -100",
				onUpdate: (self) => {
					if (isMobileMenuOpen) {
						gsap.set(navRef.current, {
							yPercent: 0,
						})
						return
					}
					if (self.direction !== lastDirection) {
						lastDirection = self.direction
						gsap.to(navRef.current, {
							yPercent:
								self.direction === 1 ? -100 : 0,
							duration: 0.3,
							ease: "power2.out",
						})
					}
				},
			})
		})

		return () => ctx.revert()
	}, [isMobileMenuOpen])

	useEffect(() => {
		const sections = [
			"about",
			"vision",
			"members",
			"contact",
		]
		const observers: IntersectionObserver[] = []

		for (const id of sections) {
			const el = document.getElementById(id)
			if (!el) continue

			const observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							setActiveSection(`/#${id}`)
						}
					}
				},
				{ threshold: 0.3 },
			)
			observer.observe(el)
			observers.push(observer)
		}

		const matchedRoute = MAIN_PAGE_LINKS.find((link) =>
			pathname.startsWith(link.href),
		)
		if (matchedRoute) {
			setActiveSection(matchedRoute.href)
		}

		return () => {
			for (const obs of observers) obs.disconnect()
		}
	}, [pathname])

	useEffect(() => {
		document.body.style.overflow = isMobileMenuOpen
			? "hidden"
			: ""
		if (isMobileMenuOpen && navRef.current) {
			gsap.set(navRef.current, { yPercent: 0 })
		}
		return () => {
			document.body.style.overflow = ""
		}
	}, [isMobileMenuOpen])

	useEffect(() => {
		const handleOutsideClick = (event: MouseEvent) => {
			const target = event.target as Node
			if (accountRef.current && !accountRef.current.contains(target)) {
				setIsAccountOpen(false)
			}
		}

		document.addEventListener("mousedown", handleOutsideClick)
		return () => {
			document.removeEventListener("mousedown", handleOutsideClick)
		}
	}, [])

	const closeMobileMenu = useCallback(() => {
		setIsMobileMenuOpen(false)
		setIsAccountOpen(false)
	}, [])

	const promptSignOut = useCallback(() => {
		setIsAccountOpen(false)
		setShowSignOutModal(true)
	}, [])

	const handleSignOut = useCallback(async () => {
		setIsSigningOut(true)
		setIsMobileMenuOpen(false)
		setAccountLabel("Account")
		const { signOutAction } = await import("@/actions/sign-out")
		await signOutAction()
	}, [])

	const textColor = isDarkSection
		? "text-white"
		: "text-[#232f3e]"
	const hoverColor = "hover:text-[#ff9900]"
	const activeColor = "text-[#ff9900]"
	const bgStyle = isScrolled
		? isDarkSection
			? "bg-[#0d1117]/80 backdrop-blur-xl border-b border-white/5"
			: "bg-white/80 backdrop-blur-xl border-b border-black/5 shadow-lg shadow-black/[0.03]"
		: "bg-transparent"

	function linkClass(href: string) {
		return `link-underline text-sm font-medium transition-colors duration-300 ${
			activeSection === href
				? activeColor
				: `${textColor} ${hoverColor}`
		}`
	}

	return (
		<>
			<nav
				ref={navRef}
				aria-label="Main navigation"
				className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${bgStyle}`}
			>
				<div className="px-4 sm:px-6 lg:px-8">
					<div className="flex items-center h-16 lg:h-20">
							<Link
								href="/"
								aria-label="Alpha home"
								className="flex items-center gap-2.5 group shrink-0"
							>
							<div className="relative w-10 h-10 lg:w-11 lg:h-11 transition-transform duration-300 group-hover:scale-110">
								<Image
									src="/optimized/alpha-logo.webp"
									alt="AWS Student Builder Group Logo"
									fill
									priority
									className="object-contain"
								/>
							</div>
							<div>
								<div
								className={`text-xs sm:text-sm lg:text-base font-bold transition-colors duration-500 ${textColor}`}
							>
									AWS Student Builder Group - Alpha
								</div>
								<div
									className="text-[10px] sm:text-xs text-[#ff9900] font-medium"
								>
									Rizal Technological University
								</div>
							</div>
							</Link>

						<div className="hidden xl:flex items-center gap-6 ml-auto">
							<div className="flex items-center gap-7">
								{MAIN_SECTION_LINKS.map((link) => (
									<a
										key={link.href}
										href={link.href}
										className={linkClass(link.href)}
									>
										{link.label}
									</a>
								))}
							</div>

							<div className="w-px h-5 bg-white/20" />

							<div className="flex items-center gap-7">
								{pageLinks.map((link) => {
									const NavigationLink = link.href === RECRUITMENT_URL ? "a" : Link
									return (
										<NavigationLink
											key={link.href}
											href={link.href}
											className={link.href === RECRUITMENT_URL ? "inline-flex min-h-11 items-center justify-center rounded-md bg-[#ff9900] px-4 text-xs font-semibold text-[#08090a] transition-colors hover:bg-[#ffb13d]" : linkClass(link.href)}
										>
											{link.label}
										</NavigationLink>
									)
								})}

								<div ref={accountRef} className="relative">
									{COMBINED_SITE ? recruitmentSignedIn && <><button type="button" className={`text-sm ${textColor}`} disabled={isSigningOut} onClick={() => void signOutRecruitment()}>Sign out</button>{signOutError&&<p role="alert">{signOutError}</p>}</> : isAuthenticated ? (
										<>
											<button
												type="button"
												onClick={() =>
													setIsAccountOpen((prev) => !prev)
												}
												className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${textColor} ${hoverColor}`}
											>
												{accountLabel}
												<ChevronDown
													className={`w-4 h-4 transition-transform ${
														isAccountOpen
															? "rotate-180"
															: ""
													}`}
												/>
											</button>

											{isAccountOpen && (
												<div className="absolute right-0 mt-2 w-44 rounded-md border bg-white text-[#232f3e] shadow-lg overflow-hidden">
													{isAdmin && (
														<Link
															href="/admin"
															className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
															onClick={() =>
																setIsAccountOpen(false)
															}
														>
															<Shield className="w-4 h-4" />
															Admin
														</Link>
													)}
													<Link
														href="/settings"
														className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
														onClick={() =>
															setIsAccountOpen(false)
														}
													>
														<Settings className="w-4 h-4" />
														Settings
													</Link>
													<button
														type="button"
														onClick={promptSignOut}
														className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
													>
														<LogOut className="w-4 h-4" />
														Sign out
													</button>
												</div>
											)}
										</>
									) : (
										<Link
											href="/auth/login"
											className={linkClass("/auth/login")}
										>
											Login
										</Link>
									)}
								</div>
							</div>
						</div>

						<div className="flex justify-end ml-auto xl:hidden">
							<button
								onClick={() =>
									setIsMobileMenuOpen(!isMobileMenuOpen)
								}
								className={`relative z-[60] p-2 transition-colors ${
									isMobileMenuOpen
										? "text-white"
										: `${textColor} ${hoverColor}`
								}`}
								aria-label="Toggle menu"
								aria-expanded={isMobileMenuOpen}
								aria-controls='mobile-navigation'
							>
								{isMobileMenuOpen ? (
									<X size={24} />
								) : (
									<Menu size={24} />
								)}
							</button>
						</div>
					</div>
				</div>
			</nav>

			<AnimatePresence>
				{isMobileMenuOpen && (
					<motion.div
						initial={{ clipPath: "circle(0% at 95% 3%)" }}
						animate={{
							clipPath: "circle(150% at 95% 3%)",
						}}
						exit={{ clipPath: "circle(0% at 95% 3%)" }}
						transition={{
							duration: 0.6,
							ease: [0.77, 0, 0.175, 1],
						}}
						id='mobile-navigation'
						className="fixed inset-0 z-[55] overflow-y-auto bg-[#232f3e] flex flex-col items-center py-24"
					>
						<button
							onClick={closeMobileMenu}
							className="absolute top-5 right-5 p-2 text-white hover:text-[#ff9900] transition-colors"
							aria-label="Close menu"
						>
							<X size={28} />
						</button>

						<div className="my-auto flex shrink-0 flex-col items-center gap-5 sm:gap-7">
							{mobileLinks.map((link, i) => (
								<motion.a
									key={link.href}
									href={link.href}
									onClick={closeMobileMenu}
									initial={{ y: 40, opacity: 0 }}
									animate={{ y: 0, opacity: 1 }}
									transition={{
										delay: 0.15 + i * 0.07,
										duration: 0.45,
										ease: [0.25, 1, 0.5, 1],
									}}
									className={link.href === RECRUITMENT_URL ? "inline-flex min-h-12 items-center rounded-md bg-[#ff9900] px-6 text-lg font-semibold text-[#08090a] transition-colors hover:bg-[#ffb13d]" : "urban-starblues text-4xl text-white hover:text-[#ff9900] transition-colors duration-300"}
								>
									{link.label}
								</motion.a>
							))}

							{COMBINED_SITE ? recruitmentSignedIn && <><button type="button" className="text-lg text-white" disabled={isSigningOut} onClick={() => void signOutRecruitment()}>Sign out</button>{signOutError&&<p role="alert" className="text-white">{signOutError}</p>}</> : isAuthenticated ? (
								<>
									{isAdmin && (
										<motion.a
											href="/admin"
											onClick={closeMobileMenu}
											initial={{ y: 40, opacity: 0 }}
											animate={{ y: 0, opacity: 1 }}
											transition={{
												delay: 0.15 + mobileLinks.length * 0.07,
												duration: 0.45,
												ease: [0.25, 1, 0.5, 1],
											}}
											className="urban-starblues text-4xl text-[#ff9900] hover:text-white transition-colors duration-300"
										>
											Admin
										</motion.a>
									)}
									<motion.a
										href="/settings"
										onClick={closeMobileMenu}
										initial={{ y: 40, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
										transition={{
											delay: 0.15 + (mobileLinks.length + (isAdmin ? 1 : 0)) * 0.07,
											duration: 0.45,
											ease: [0.25, 1, 0.5, 1],
										}}
										className="urban-starblues text-4xl text-white hover:text-[#ff9900] transition-colors duration-300"
									>
										Settings
									</motion.a>
									<motion.button
										type="button"
										onClick={promptSignOut}
										initial={{ y: 40, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
										transition={{
											delay: 0.22 + (mobileLinks.length + (isAdmin ? 1 : 0)) * 0.07,
											duration: 0.45,
											ease: [0.25, 1, 0.5, 1],
										}}
										className="urban-starblues text-4xl text-white hover:text-[#ff9900] transition-colors duration-300"
									>
										Sign out
									</motion.button>
								</>
							) : (
								<motion.a
									href="/auth/login"
									onClick={closeMobileMenu}
									initial={{ y: 40, opacity: 0 }}
									animate={{ y: 0, opacity: 1 }}
									transition={{
										delay:
											0.15 + mobileLinks.length * 0.07,
										duration: 0.45,
										ease: [0.25, 1, 0.5, 1],
									}}
									className="urban-starblues text-4xl text-white hover:text-[#ff9900] transition-colors duration-300"
								>
									Login
								</motion.a>
							)}
						</div>

						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 0.3 }}
							transition={{ delay: 0.6 }}
							className="absolute bottom-10"
						>
							<Image
								src="/optimized/alpha-logo.webp"
								alt="AWS Student Builder Group Logo"
								width={48}
								height={48}
								className="opacity-50 brightness-0 invert"
							/>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{showSignOutModal && (
				<SignOutModal
					isPending={isSigningOut}
					onConfirm={handleSignOut}
					onCancel={() =>
						setShowSignOutModal(false)
					}
				/>
			)}
		</>
	)
}
