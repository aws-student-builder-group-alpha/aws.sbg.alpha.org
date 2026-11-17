"use client"

import Image from "next/image"
import { Linkedin, Mail, Globe, Facebook } from "lucide-react"
import "./core-members.css"

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
	{
		name: "Emmanuel Toraja Fabella",
		role: "Executive Secretary",
		description:
			"Ensuring smooth operations and organizational excellence.",
		image: "/optimized/board-members/fabella.webp",
		linkedin:
			"https://www.linkedin.com/in/emmanuel-fabella/",
		email: "emmanuelfabella606@gmail.com",
		facebook:
			"https://www.facebook.com/1emmanuelfabella1",
	},
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

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return <a className="alpha-team-social" href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"} aria-label={label} title={label}><span aria-hidden="true">{children}</span></a>
}

function MemberCard({ member, index }: { member: Member; index: number }) {
  return <article className="alpha-team-card" role="listitem" aria-labelledby={`alpha-member-${index}`}>
    <div className="alpha-team-portrait">
      <Image src={member.image} alt={member.name} fill sizes="(min-width: 1300px) 220px, (min-width: 900px) 25vw, (min-width: 600px) 33vw, 45vw" loading="eager" className="alpha-team-image" />
      <span className="alpha-team-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
    </div>
    <div className="alpha-team-bio"><h3 id={`alpha-member-${index}`}>{member.name}</h3><p>{member.role}</p></div>
    <div className="alpha-team-contacts" role="group" aria-label={`Connect with ${member.name}`}>
      {member.facebook && <SocialIcon href={member.facebook} label={`${member.name} on Facebook`}><Facebook size={15} /></SocialIcon>}
      {member.linkedin && <SocialIcon href={member.linkedin} label={`${member.name} on LinkedIn`}><Linkedin size={15} /></SocialIcon>}
      {member.email && <SocialIcon href={`mailto:${member.email}`} label={`Email ${member.name}`}><Mail size={15} /></SocialIcon>}
      {member.blog && <SocialIcon href={member.blog} label={`Visit ${member.name}’s website`}><Globe size={15} /></SocialIcon>}
    </div>
  </article>
}

export default function CoreMembers() {
  return <section id="members" data-theme="dark" className="alpha-team alpha-scene" aria-labelledby="alpha-team-heading">
    <div className="alpha-team-inner">
      <header className="alpha-team-heading">
        <div><span className="alpha-team-eyebrow">Our people</span><h2 id="alpha-team-heading">Meet your future <em>teammates.</em></h2></div>
        <div className="alpha-team-heading-meta"><span className="alpha-team-size">{MEMBERS.length} core members</span><span className="alpha-team-wolf-stop" data-wolf-stop="team" aria-hidden="true" /></div>
      </header>
      <div className="alpha-team-grid" role="list" aria-label="Your future teammates">
        {MEMBERS.map((member, index) => <MemberCard key={member.name} member={member} index={index} />)}
      </div>
    </div>
  </section>
}
