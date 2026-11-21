"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import AwsLogo from "@/components/aws-logo"
import Link from "next/link"
import {
	ArrowRight,
	ChevronDown,
	LogOut,
	Menu,
	Settings,
	Shield,
	X,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/services/supabase-client.service"
import SignOutModal from "@/components/sign-out-modal"
import { RECRUITMENT_URL } from "@/lib/recruitment"
import { MAIN_SECTION_LINKS, MAIN_PAGE_LINKS } from "@/lib/navigation"
import "./navigation.css"

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
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [observedSection, setActiveSection] = useState("")
	const activeSection = MAIN_PAGE_LINKS.find(link => pathname.startsWith(link.href))?.href ?? observedSection
	const [isInHero, setIsInHero] = useState(pathname === "/")
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
	const [signOutSource, setSignOutSource] = useState<"desktop" | "mobile" | null>(null)
	const [isSigningOut, setIsSigningOut] = useState(false)
	const navRef = useRef<HTMLElement>(null)
	const accountRef = useRef<HTMLDivElement>(null)
	const mobileMenu = useRef<HTMLDialogElement>(null)
	const mobileToggle = useRef<HTMLButtonElement>(null)
	const pageLinks = MAIN_PAGE_LINKS

	useEffect(() => {
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
		let frame = 0
		const update = () => {
			frame = 0
			const navHeight = navRef.current?.offsetHeight ?? 80
			const hero = document.querySelector(".alpha-opening")
			setIsInHero(Boolean(hero && hero.getBoundingClientRect().bottom > navHeight + 24))
            const progress = pathname === "/" ? Math.min(1, Math.max(0, window.scrollY / 320)) : 1
            navRef.current?.style.setProperty("--alpha-nav-progress", String(progress))
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
		const sections = [
			"about",
			"recruitment",
            "events",
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


		return () => {
			for (const obs of observers) obs.disconnect()
		}
	}, [pathname])

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

	const openMobileMenu = useCallback(() => {
		const dialog = mobileMenu.current
		if (!dialog || dialog.open || !mobileToggle.current?.getClientRects().length) return
		setIsAccountOpen(false)
		dialog.showModal()
		setIsMobileMenuOpen(true)
	}, [])

	const closeMobileMenu = useCallback(() => {
		mobileMenu.current?.close()
		setIsMobileMenuOpen(false)
		mobileToggle.current?.focus({ preventScroll: true })
	}, [])

	useEffect(() => {
		const dialog = mobileMenu.current
		const desktop = window.matchMedia("(min-width: 80rem)")
		const closeOnDesktop = () => {
			if (!desktop.matches || !dialog?.open) return
			closeMobileMenu()
			navRef.current?.querySelector<HTMLElement>(".alpha-navigation-links a")?.focus({ preventScroll: true })
		}
		desktop.addEventListener("change", closeOnDesktop)
		return () => {
			desktop.removeEventListener("change", closeOnDesktop)
			dialog?.close()
		}
	}, [pathname, closeMobileMenu])

	const promptSignOut = useCallback(() => {
		setIsAccountOpen(false)
		setSignOutSource("desktop")
	}, [])

	const handleSignOut = useCallback(async () => {
		setIsSigningOut(true)
		setAccountLabel("Account")
		const { signOutAction } = await import("@/actions/sign-out")
		await signOutAction()
	}, [])

	const textColor = isInHero
		? "text-white"
		: "text-[#232f3e]"
	const hoverColor = "hover:text-[#ff9900]"
	const activeColor = "text-[#ff9900]"
	const bgStyle = pathname === "/" ? "alpha-nav-surface" : isInHero
		? "bg-white/10 backdrop-blur-xl"
		: "bg-white/70 backdrop-blur-xl border-b border-black/5 shadow-lg shadow-black/[0.03]"

	function linkClass(href: string) {
		return `link-underline text-sm font-medium transition-colors duration-300 ${
			activeSection === href
				? activeColor
				: `${textColor} ${hoverColor}`
		}`
	}

	return (
		<>
			{pathname === "/" && <div className="alpha-viewport-frame" aria-hidden="true" />}
			<nav
				ref={navRef}
				aria-label="Main navigation"
				className="fixed top-0 left-0 right-0 z-50"
				data-in-hero={isInHero}
			>
				{pathname === "/" && <a className="alpha-recruiting-banner" href={RECRUITMENT_URL + "/opportunities"}>
					<span className="alpha-recruiting-dot" aria-hidden="true" />
					<strong>We’re recruiting!</strong>
					<span className="alpha-recruiting-details">Join the Core Team or a Committee.</span>
					<span className="alpha-recruiting-cta">Find your role <ArrowRight size={15} aria-hidden="true" /></span>
				</a>}
				<div className={`transition-colors duration-300 ${bgStyle}`}>
				<div className="alpha-navigation-gutter">
					<div className="alpha-navigation-row relative flex items-center h-16 lg:h-20">
							<Link
								href="/"
								aria-label="Alpha home"
								className="flex min-w-0 items-center gap-2.5 group"
							>
							<div className="alpha-navigation-logo relative shrink-0 w-10 h-10 lg:w-11 lg:h-11 transition-transform duration-300 group-hover:scale-110">
								<Image
									src="/optimized/alpha-logo.webp"
									alt="AWS Student Builder Group Logo"
									fill
									priority
									className="object-contain"
								/>
							</div>
							</Link>
							<strong className={`alpha-navigation-name ${textColor}`}>
								<span className="alpha-navigation-organization"><span className="alpha-navigation-aws"><AwsLogo /></span> Student Builder Group</span>
								<span className="sr-only"> - </span>
								<span className="alpha-navigation-chapter">Alpha</span>
							</strong>

						<div className="alpha-navigation-desktop hidden xl:contents">
							<div className="alpha-navigation-links flex items-center gap-7">
								{MAIN_SECTION_LINKS.map((link) => (
									<a
										key={link.href}
										href={link.href}
										className={linkClass(link.href)}
									>
										{link.href === RECRUITMENT_URL + "/opportunities" ? "Become a Member" : link.label}
									</a>
								))}
							</div>


							<div className="alpha-navigation-actions ml-auto flex items-center gap-7">
								{pageLinks.map((link) => {
									const NavigationLink = link.href === RECRUITMENT_URL + "/opportunities" ? "a" : Link
									return (
										<NavigationLink
											key={link.href}
											href={link.href}
											className={link.href === RECRUITMENT_URL + "/opportunities" ? "inline-flex min-h-11 items-center justify-center rounded-md bg-[#ff9900] px-4 text-xs font-semibold text-[#08090a] transition-colors hover:bg-[#ffb13d]" : linkClass(link.href)}
										>
											{link.href === RECRUITMENT_URL + "/opportunities" ? "Become a Member" : link.label}
										</NavigationLink>
									)
								})}

								<div ref={accountRef} className="relative">
									{isAuthenticated ? (
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
								ref={mobileToggle}
								type="button"
								onClick={openMobileMenu}
								className={`inline-grid size-11 place-items-center transition-colors ${textColor} ${hoverColor}`}
								aria-label="Open menu"
								aria-haspopup="dialog"
								aria-expanded={isMobileMenuOpen}
								aria-controls="mobile-navigation"
							>
								<Menu size={24} strokeWidth={1.6} aria-hidden="true" />
							</button>
						</div>
					</div>
				</div>
				</div>
			</nav>

			<dialog
				ref={mobileMenu}
				id="mobile-navigation"
				className="alpha-mobile-navigation"
				aria-label="Main navigation menu"
				data-lenis-prevent
				onCancel={event => { event.preventDefault(); closeMobileMenu() }}
				onClose={() => { if (!mobileMenu.current?.open) setIsMobileMenuOpen(false) }}
			>
				<button type="button" className="alpha-mobile-close" aria-label="Close menu" onClick={closeMobileMenu}>
					<X size={28} strokeWidth={1.6} aria-hidden="true" />
				</button>

				<div className="alpha-mobile-links">
					{MAIN_SECTION_LINKS.map(link => (
						<a key={link.href} href={link.href} onClick={closeMobileMenu}
							aria-current={pathname === link.href ? "page" : undefined}>
							{link.label}
						</a>
					))}
				</div>

				<div className="alpha-mobile-account">
					{pageLinks.map(link => (
						<a key={link.href} href={link.href} onClick={closeMobileMenu}>Become a Member</a>
					))}
					{isAuthenticated ? (
						<>
							{isAdmin && <Link href="/admin" onClick={closeMobileMenu}>Admin</Link>}
							<Link href="/settings" onClick={closeMobileMenu} aria-current={pathname === "/settings" ? "page" : undefined}>
								Settings
							</Link>
							<button type="button" onClick={() => { closeMobileMenu(); setSignOutSource("mobile") }}>Sign out</button>
						</>
					) : (
						<Link href="/auth/login" onClick={closeMobileMenu}>Login</Link>
					)}
				</div>

				<Image className="alpha-mobile-mark" src="/optimized/alpha-logo.webp" alt="" width={48} height={48} />
			</dialog>

			{signOutSource && (
				<SignOutModal
					isPending={isSigningOut}
					focusCancel={signOutSource === "mobile"}
					onConfirm={handleSignOut}
					onCancel={() => {
						setSignOutSource(null)
						// Let Escape finish dismissing the confirmation before reopening the menu.
						if (signOutSource === "mobile") requestAnimationFrame(openMobileMenu)
					}}
				/>
			)}
		</>
	)
}
