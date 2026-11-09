import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import SmoothScroll from "@/components/smooth-scroll"
import PageLoader from "@/components/page-loader"
import ScrollProgress from "@/components/scroll-progress"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	metadataBase: new URL(
		(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://awslc.alpha.org')
			.split(',')[0].trim(),
	),
	title:
		"AWS Student Builder Group - Alpha | Rizal Technological University",
	description:
		"Join the AWS Student Builder Group - Alpha at Rizal Technological University. Learn cloud computing, build projects, and grow your skills with AWS.",
	generator: "v0.app",
	icons: {
		icon: "/optimized/favicon.png",
		apple: "/optimized/apple-touch-icon.png",
		shortcut: "/optimized/favicon.png",
	},
	openGraph: {
		title:
			"AWS Student Builder Group - Alpha | Rizal Technological University",
		description:
			"Join the AWS Student Builder Group - Alpha at Rizal Technological University. Learn cloud computing, build projects, and grow your skills with AWS.",
		images: [
			{
				url: "/Logo (2).png",
				width: 1200,
				height: 630,
				alt: "AWS Student Builder Group - Alpha Logo",
			},
		],
		siteName: "AWS Student Builder Group - Alpha",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title:
			"AWS Student Builder Group - Alpha | Rizal Technological University",
		description:
			"Join the AWS Student Builder Group - Alpha at Rizal Technological University. Learn cloud computing, build projects, and grow your skills with AWS.",
		images: ["/Logo (2).png"],
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			suppressHydrationWarning
		>
			<body suppressHydrationWarning>
				<PageLoader />
				<ScrollProgress />
				<SmoothScroll>{children}</SmoothScroll>
			</body>
		</html>
	)
}
