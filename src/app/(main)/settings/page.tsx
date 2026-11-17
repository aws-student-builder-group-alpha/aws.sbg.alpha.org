import { Footer } from "@/app/(main)/(landing)"
import ServerNavigation from "@/app/(main)/(landing)/shared/server-navigation"
import { requireUser } from "@/services/auth.service"

export default async function SettingsPage() {
	const user = await requireUser("/settings")

	return (
		<>
			<ServerNavigation />
			<main className="min-h-screen bg-[#f0f4f8] pt-28 px-4 sm:px-6 lg:px-8">
				<div className="container mx-auto max-w-3xl">
					<div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
						<p className="text-xs uppercase tracking-widest text-[#ff9900] font-semibold mb-3">
							Account
						</p>
						<h1 className="text-3xl font-bold text-[#232f3e] mb-2">
							Settings
						</h1>
						<p className="text-sm text-muted-foreground mb-6">
							Manage your account details for AWS Student Builder Group - Alpha.
						</p>

						<div className="rounded-lg bg-muted/40 border p-4">
							<p className="text-xs text-muted-foreground uppercase tracking-wider">
								Signed in email
							</p>
							<p className="text-sm font-medium mt-1">
								{user.email}
							</p>
						</div>
					</div>
				</div>
			</main>
			<Footer />
		</>
	)
}
