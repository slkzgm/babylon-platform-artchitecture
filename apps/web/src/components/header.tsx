"use client";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";

export default function Header() {
	const { login } = usePrivy();
	const auth = useAuth();

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-4 py-2">
				<nav className="flex items-center gap-4">
					<Link href="/" className="font-bold text-lg">
						Babylon
					</Link>
				</nav>
				<div className="flex items-center gap-2">
					{auth.status === "authenticated" && (
						<Link href="/profile">
							<Button variant="ghost" size="sm">
								@{auth.user.username}
							</Button>
						</Link>
					)}
					{auth.status === "unauthenticated" && (
						<Button variant="outline" size="sm" onClick={login}>
							Sign In
						</Button>
					)}
					<ModeToggle />
				</div>
			</div>
			<hr />
		</div>
	);
}
