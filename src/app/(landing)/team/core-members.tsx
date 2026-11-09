"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { Linkedin, Mail, Globe, Facebook } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

interface Member {
	name: string
	role: string
	description: string
	image: string
	linkedin?: string
	email?: string
	blog?: string
	facebook?: string
}

const MEMBERS: Member[] = [
	{
		name: "Catherine Notado",
		role: "Founder, University Captain, and Chief Executive Officer",
		description:
			"Leading the AWS Student Builder Group - Alpha with vision and passion for cloud education.",
		image: "/optimized/board-members/notado.webp",
		linkedin:
			"https://www.linkedin.com/in/catherine-notado-679a29246",
		email: "notadocath@gmail.com",
		facebook:
			"https://www.facebook.com/profile.php?id=100009325386830",
	},
	// {
	// 	name: "Emmanuel Toraja Fabella",
	// 	role: "Executive Secretary",
	// 	description:
	// 		"Ensuring smooth operations and organizational excellence.",
	// 	image: "/optimized/board-members/fabella.webp",
	// 	linkedin:
	// 		"https://www.linkedin.com/in/emmanuel-fabella/",
	// 	email: "emmanuelfabella606@gmail.com",
	// 	facebook:
	// 		"https://www.facebook.com/1emmanuelfabella1",
	// },
	{
		name: "Ram Christopher Broqueza Baarde",
		role: "Co-Founder, Co-Captain, and Chief Finance Officer",
		description:
			"Strategic financial management and co-leadership of the club.",
		image: "/optimized/board-members/baarde.webp",
		linkedin:
			"https://www.linkedin.com/in/rambaarde-software",
		email: "ramchrist20@gmail.com",
		blog: "https://rambaarde.com",
		facebook:
			"https://www.facebook.com/ramchristopher.software/",
	},
	{
		name: "Jin Anthony Serna Pradas",
		role: "Chief Operations Officer",
		description:
			"Overseeing daily operations and ensuring club efficiency.",
		image: "/optimized/board-members/pradas.webp",
		linkedin:
			"https://www.linkedin.com/in/jin-anthony-pradas/",
		email: "jinanthonyy@gmail.com",
		facebook: "https://www.facebook.com/jinanthonyy",
	},
	{
		name: "Mary Angela Kristel Garganera",
		role: "Executive Secretary of Operations",
		description:
			"Managing operational documentation and administrative excellence.",
		image: "/optimized/board-members/garganera.webp",
		linkedin:
			"https://www.linkedin.com/in/mary-angela-kristel-garganera-a210942ba",
		email: "maryangelakristel@gmail.com",
		facebook:
			"https://www.facebook.com/mary.angela.kristel",
	},
	{
		name: "Jogiofernesto Ardales",
		role: "Chief Marketing Officer",
		description:
			"Leading marketing strategies and brand promotion.",
		image: "/optimized/board-members/ardales.webp",
		linkedin:
			"https://www.linkedin.com/in/jogiofernesto-jr-ardales",
		email: "giofernesto@gmail.com",
		facebook:
			"https://www.facebook.com/gionardo.da.vinci",
	},
	{
		name: "David Aldreen Flores Marquez",
		role: "Vice-Chief Marketing Officer",
		description:
			"Supporting marketing initiatives and community outreach.",
		image: "/optimized/board-members/marquez.webp",
		linkedin:
			"https://www.linkedin.com/in/david-aldreen-marquez-135683394/",
		email: "aldreendavidmarquez@gmail.com",
		facebook:
			"https://www.facebook.com/DavidAldreenFloresMarquez",
	},
	{
		name: "Josefine Claire H. Leviste",
		role: "Chief Relations Officer",
		description:
			"Building partnerships and managing external relationships.",
		image: "/optimized/board-members/leviste.webp",
		linkedin:
			"https://www.linkedin.com/in/josefine-leviste-m134340/",
		email: "josefine.leviste@gmail.com",
		facebook: "https://www.facebook.com/josefine.leviste",
	},
	{
		name: "Kyla Nicole Gagui",
		role: "Chief Creatives Officer",
		description:
			"Leading creative direction and visual content development.",
		image: "/optimized/board-members/gagui.webp",
		linkedin:
			"https://ph.linkedin.com/in/gagui-kyla-nicole-m-89424338a",
		email: "kylanicole1330@gmail.com",
		facebook: "https://www.facebook.com/kylezxnj",
	},
	{
		name: "Kristine Jamelle Ignas",
		role: "BUILDHERS+ Ambassador",
		description:
			"Representing the club in BUILDHERS+ initiatives and partnerships.",
		image: "/optimized/board-members/ignas.webp",
		linkedin:
			"https://www.linkedin.com/in/kristine-jamelle-ignas-6b2457303",
		email: "jamelleignas29@gmail.com",
		facebook:
			"https://www.facebook.com/kristinejamelle.ignas",
	},
	{
		name: "Jihad Fariq Tejam",
		role: "Skillbuilders Chairperson",
		description:
			"Leading skill development programs and educational initiatives.",
		image: "/optimized/board-members/tejam.webp",
		linkedin:
			"https://www.linkedin.com/in/tejam-jihad",
		email: "jihadtejam@gmail.com",
		facebook:
			"https://www.facebook.com/Ghadfariq.tejam",
	},
]

function SocialIcon({
	href,
	label,
	children,
}: {
	href: string
	label: string
	children: React.ReactNode
}) {
	return (
		<a
			href={href}
			target={href.startsWith("mailto:") ? undefined : "_blank"}
			rel={
				href.startsWith("mailto:")
					? undefined
					: "noopener noreferrer"
			}
			className="w-8 h-8 rounded-full bg-white/10
				flex items-center justify-center
				hover:bg-[#ff9900] hover:scale-110
				transition-all duration-300 text-white/70
				hover:text-white"
			aria-label={label}
		>
			{children}
		</a>
	)
}

function MemberCard({
	member,
	index,
}: {
	member: Member
	index: number
}) {
	return (
		<div
			className="member-card flex-shrink-0
				w-[75vw] sm:w-80 lg:w-96 group"
		>
			<div
				className="relative rounded-2xl overflow-hidden
					bg-[#232f3e]"
			>
				{/* Card number */}
				<div
					className="absolute top-4 right-4 z-10
						text-xs uppercase tracking-[0.2em]
						text-white/20 font-medium"
				>
					{String(index + 1).padStart(2, "0")}
				</div>
				{/* Photo */}
				<div className="relative h-80 sm:h-96 overflow-hidden">
					<Image
						src={member.image}
						alt={member.name}
						fill
						className="object-cover
							md:grayscale md:group-hover:grayscale-0
							md:group-hover:scale-105
							transition-all duration-700"
					/>
					{/* Gradient overlay */}
					<div
						className="absolute inset-0 bg-gradient-to-t
							from-[#232f3e] via-[#232f3e]/20
							to-transparent"
					/>

					{/* Social icons - appear on hover */}
					<div
						className="absolute bottom-4 left-4
							flex gap-2
							opacity-100 translate-y-0
							md:opacity-0 md:translate-y-4
							md:group-hover:opacity-100
							md:group-hover:translate-y-0
							transition-all duration-500"
					>
						{member.facebook && (
							<SocialIcon
								href={member.facebook}
								label="Facebook"
							>
								<Facebook size={14} />
							</SocialIcon>
						)}
						{member.linkedin && (
							<SocialIcon
								href={member.linkedin}
								label="LinkedIn"
							>
								<Linkedin size={14} />
							</SocialIcon>
						)}
						{member.email && (
							<SocialIcon
								href={`mailto:${member.email}`}
								label="Email"
							>
								<Mail size={14} />
							</SocialIcon>
						)}
						{member.blog && (
							<SocialIcon
								href={member.blog}
								label="Blog"
							>
								<Globe size={14} />
							</SocialIcon>
						)}
					</div>
				</div>

				{/* Info */}
				<div className="p-5">
					<h3
						className="text-lg font-bold text-white
							mb-1"
					>
						{member.name}
					</h3>
					<p
						className="text-[#ff9900] text-xs
							uppercase tracking-[0.15em]
							font-medium leading-relaxed"
					>
						{member.role}
					</p>
				</div>
			</div>
		</div>
	)
}

export default function CoreMembers() {
	const sectionRef = useRef<HTMLElement>(null)
	const trackRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const section = sectionRef.current
		const track = trackRef.current
		if (!section || !track) return

		const media = gsap.matchMedia(section)
		media.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
			const scrollDistance = () =>
				Math.max(0, track.scrollWidth - track.offsetWidth)

			if (scrollDistance() === 0) return

			track.scrollLeft = 0
			track.dataset.scrollDriven = ""
			gsap.to(track, {
				x: () => -scrollDistance(),
				ease: "none",
				force3D: true,
				scrollTrigger: {
					trigger: section,
					start: "top top",
					end: () => `+=${scrollDistance() + 180}`,
					scrub: 0.6,
					pin: true,
					anticipatePin: 1,
					fastScrollEnd: true,
					invalidateOnRefresh: true,
				},
			})
			return () => {
				delete track.dataset.scrollDriven
			}
		})

		return () => media.revert()
	}, [])

	return (
		<section
			id="members"
			ref={sectionRef}
			data-theme="dark"
			className="section-dark overflow-hidden
				min-h-screen flex flex-col"
		>
			<div className="flex-1 flex flex-col
				justify-center
				py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
				<div className="container mx-auto max-w-6xl mb-12">
					<span
						className="text-xs uppercase
							tracking-[0.3em] text-[#ff9900]
							font-medium mb-4 block"
					>
						Our People
					</span>
					<h2
						className="text-3xl sm:text-4xl lg:text-5xl
							font-bold text-white"
					>
						Core Team
					</h2>
				</div>

				{/* Horizontal scroll track */}
				<div
					ref={trackRef}
					className="flex gap-5 sm:gap-6 lg:gap-8
						pl-4 sm:pl-8 overflow-x-auto data-[scroll-driven]:overflow-visible
						will-change-transform
						lg:pl-[calc((100vw-72rem)/2+2rem)]"
				>
					{MEMBERS.map((member, i) => (
						<MemberCard
							key={member.name}
							member={member}
							index={i}
						/>
					))}
				</div>
			</div>
		</section>
	)
}
