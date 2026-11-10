"use client"

import {
	Linkedin,
	Mail,
	Facebook,
	Twitter,
	Instagram,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { RECRUITMENT_URL } from "@/lib/recruitment"
import { MAIN_SECTION_LINKS, MAIN_PAGE_LINKS } from "@/lib/navigation"

const SOCIAL_LINKS = [
	{
		href: "https://www.facebook.com/AWSStudentBuilderGroupAlpha",
		label: "Facebook",
		icon: Facebook,
	},
	{
		href: "https://x.com/awslc_alpha",
		label: "Twitter",
		icon: Twitter,
	},
	{
		href: "https://linkedin.com/company/aws-learning-club-alpha",
		label: "LinkedIn",
		icon: Linkedin,
	},
	{
		href: "https://instagram.com/awslc.alpha",
		label: "Instagram",
		icon: Instagram,
	},
]

export default function Footer() {
	return (
		<footer
			data-theme="dark"
			className="section-darker py-16 px-4 sm:px-6 lg:px-8"
		>
			<div className="container mx-auto max-w-6xl">
				{/* Brand label */}
				<div className="mb-12 text-center">
					<p
						className="urban-starblues mx-auto
							max-w-5xl text-2xl sm:text-4xl
							lg:text-6xl text-[#ff9900]/25
							select-none leading-[0.95]
							tracking-normal"
					>
						AWS Student Builder Group - Alpha
					</p>
				</div>

				{/* Gradient top border */}
				<div
					className="h-px mb-12 bg-gradient-to-r
						from-transparent via-[#ff9900]/30
						to-transparent"
				/>

				<div
					className="grid grid-cols-1 md:grid-cols-4
						gap-10 lg:gap-16 mb-12"
				>
					{/* Brand */}
					<div className="md:col-span-2">
						<div
							className="flex items-center gap-3
								mb-4"
						>
							<div className="relative w-10 h-10">
								<Image
									src="/optimized/alpha-logo.webp"
									alt="AWS Student Builder Group Logo"
									fill
									className="object-contain"
								/>
							</div>
							<div>
								<div
									className="text-base font-semibold
										text-white"
								>
									AWS Student Builder Group - Alpha
								</div>
								<div
									className="text-xs
										text-white/40"
								>
									Rizal Technological University
								</div>
							</div>
						</div>
						<p
							className="text-sm text-white/40
								leading-relaxed mb-6 max-w-sm"
						>
							Empowering students with AWS skills and
							cloud computing knowledge through
							hands-on learning and community
							collaboration.
						</p>

						{/* Social icons */}
						<div className="flex gap-3">
							{SOCIAL_LINKS.map((social) => {
								const Icon = social.icon
								return (
									<a
										key={social.label}
										href={social.href}
										target="_blank"
										rel="noopener noreferrer"
										className="w-10 h-10 rounded-full
											border border-white/10
											flex items-center
											justify-center text-white/50
											hover:border-[#ff9900]
											hover:text-[#ff9900]
											hover:scale-110
											transition-all duration-300"
										aria-label={social.label}
									>
										<Icon size={16} />
									</a>
								)
							})}
						</div>
					</div>

					{/* Quick Links */}
					<nav aria-label="Footer quick links">
						<h3
							className="font-semibold text-white
								mb-4 text-sm uppercase
								tracking-wider"
						>
							Quick Links
						</h3>
						<ul className="space-y-3">
							{[...MAIN_SECTION_LINKS, ...MAIN_PAGE_LINKS].map((link) => {
								const FooterLink = link.href === RECRUITMENT_URL ? "a" : Link
								return (
									<li key={link.href}>
										<FooterLink href={link.href} className="text-sm text-white/70 hover:text-[#ff9900] transition-colors">
											{link.label}
										</FooterLink>
									</li>
								)
							})}
						</ul>
					</nav>

					{/* Contact */}
					<div>
						<h3
							className="font-semibold text-white
								mb-4 text-sm uppercase
								tracking-wider"
						>
							Contact
						</h3>
						<ul className="space-y-3">
							<li
								className="flex items-center gap-2
									text-sm text-white/50"
							>
								<Mail
									size={14}
									className="text-[#ff9900]"
								/>
								<a
									href="mailto:awslc.alpha@gmail.com"
									className="hover:text-[#ff9900]
										transition-colors"
								>
									awslc.alpha@gmail.com
								</a>
							</li>
							<li
								className="text-sm text-white/50"
							>
								Rizal Technological University
							</li>
							<li
								className="text-sm text-white/50"
							>
								Boni Avenue, Mandaluyong City
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Bar */}
				<div
					className="pt-8 border-t border-white/10
						flex flex-col sm:flex-row items-center
						justify-between gap-4"
				>
					<p className="text-sm text-white/30">
						&copy; {new Date().getFullYear()} AWS
						Student Builder Group - Alpha. All rights
						reserved.
					</p>
					<div
						className="urban-starblues text-white/10
							text-lg select-none"
					>
						Day One
					</div>
				</div>
			</div>
		</footer>
	)
}
