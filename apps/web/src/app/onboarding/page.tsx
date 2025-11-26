"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { ApiRequestError, identity } from "@/lib/api";

export default function OnboardingPage() {
	const router = useRouter();
	const { ready, authenticated } = usePrivy();
	const auth = useAuth();
	const queryClient = useQueryClient();

	const [username, setUsername] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [usernameError, setUsernameError] = useState<string | null>(null);
	const [isCheckingUsername, setIsCheckingUsername] = useState(false);
	const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const createUserMutation = useMutation({
		mutationFn: (data: { username: string; displayName?: string }) =>
			identity.createUser(data),
		onSuccess: () => {
			toast.success("Welcome to Babylon!");
			queryClient.invalidateQueries({ queryKey: ["me"] });
			router.push("/profile");
		},
		onError: (error) => {
			if (error instanceof ApiRequestError) {
				if (error.status === 409) {
					setUsernameError(error.message);
				} else {
					toast.error(error.message);
				}
			} else {
				toast.error("Something went wrong. Please try again.");
			}
		},
	});

	// Redirect if not authenticated or already onboarded
	useEffect(() => {
		if (ready && !authenticated) {
			router.push("/");
		} else if (auth.status === "authenticated") {
			router.push("/profile");
		}
	}, [ready, authenticated, auth.status, router]);

	const handleUsernameChange = (value: string) => {
		const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
		setUsername(normalized);
		setUsernameError(null);

		// Clear any pending check
		if (usernameCheckTimeout.current) {
			clearTimeout(usernameCheckTimeout.current);
			usernameCheckTimeout.current = null;
		}

		if (normalized.length < 3) {
			setIsCheckingUsername(false);
			return;
		}

		setIsCheckingUsername(true);

		// Debounce the API call
		usernameCheckTimeout.current = setTimeout(async () => {
			try {
				const { available } = await identity.checkUsername(normalized);
				if (!available) {
					setUsernameError("This username is already taken");
				}
			} catch {
				// Ignore check errors
			} finally {
				setIsCheckingUsername(false);
			}
		}, 300);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (username.length < 3) {
			setUsernameError("Username must be at least 3 characters");
			return;
		}

		if (usernameError) {
			return;
		}

		createUserMutation.mutate({
			username,
			displayName: displayName || undefined,
		});
	};

	const isValid = username.length >= 3 && !usernameError && !isCheckingUsername;

	// Show loader while checking auth or redirecting
	if (
		auth.status === "loading" ||
		(ready && !authenticated) ||
		auth.status === "authenticated"
	) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader />
			</div>
		);
	}

	return (
		<div className="flex h-full items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Complete your profile</CardTitle>
					<CardDescription>
						Choose a username to get started on Babylon
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								placeholder="username"
								value={username}
								onChange={(e) => handleUsernameChange(e.target.value)}
								className={usernameError ? "border-red-500" : ""}
							/>
							{usernameError && (
								<p className="text-red-500 text-sm">{usernameError}</p>
							)}
							<p className="text-muted-foreground text-sm">
								3-50 characters, lowercase letters, numbers, and underscores
								only
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="displayName">Display Name (optional)</Label>
							<Input
								id="displayName"
								placeholder="Your display name"
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
							/>
						</div>

						<Button
							type="submit"
							className="w-full"
							disabled={!isValid || createUserMutation.isPending}
						>
							{createUserMutation.isPending ? "Creating..." : "Create Account"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
