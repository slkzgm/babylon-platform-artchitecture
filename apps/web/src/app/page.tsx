"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
	const router = useRouter();
	const { login } = usePrivy();
	const auth = useAuth();

	// Redirect based on auth state
	useEffect(() => {
		if (auth.status === "needs-onboarding") {
			router.push("/onboarding");
		} else if (auth.status === "authenticated") {
			router.push("/profile");
		}
	}, [auth.status, router]);

	if (auth.status === "loading") {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader />
			</div>
		);
	}

	if (auth.status === "banned") {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 p-4">
				<div className="max-w-md space-y-2 text-center">
					<h1 className="font-bold text-2xl">Account suspended</h1>
					<p className="text-muted-foreground">
						{auth.message ||
							"Your account has been suspended. If you think this is a mistake, please contact support."}
					</p>
				</div>
				<Button variant="outline" onClick={auth.logout}>
					Sign out
				</Button>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-8 p-4">
			<div className="text-center">
				<h1 className="font-bold text-4xl">Welcome to Babylon</h1>
				<p className="mt-2 text-muted-foreground">Sign in to get started</p>
			</div>

			<Button size="lg" onClick={login}>
				Sign In
			</Button>
		</div>
	);
}
