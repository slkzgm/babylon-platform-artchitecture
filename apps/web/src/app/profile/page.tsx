"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { useAuth, useInvalidateUser } from "@/hooks/use-auth";
import { ApiRequestError, identity } from "@/lib/api";

export default function ProfilePage() {
	const router = useRouter();
	const auth = useAuth();
	const invalidateUser = useInvalidateUser();

	const [isEditing, setIsEditing] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const [bio, setBio] = useState("");

	const updateMutation = useMutation({
		mutationFn: (data: { displayName?: string; bio?: string }) =>
			identity.updateMe(data),
		onSuccess: () => {
			toast.success("Profile updated!");
			invalidateUser();
			setIsEditing(false);
		},
		onError: (error) => {
			if (error instanceof ApiRequestError) {
				toast.error(error.message);
			} else {
				toast.error("Failed to update profile");
			}
		},
	});

	// Redirect if not authenticated or needs onboarding
	useEffect(() => {
		if (auth.status === "unauthenticated") {
			router.push("/");
		} else if (auth.status === "needs-onboarding") {
			router.push("/onboarding");
		}
	}, [auth.status, router]);

	// Show loader while loading or redirecting
	if (
		auth.status === "loading" ||
		auth.status === "unauthenticated" ||
		auth.status === "needs-onboarding"
	) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader />
			</div>
		);
	}

	const { user } = auth;

	const handleStartEditing = () => {
		setDisplayName(user.displayName ?? "");
		setBio(user.bio ?? "");
		setIsEditing(true);
	};

	const handleSave = () => {
		updateMutation.mutate({
			displayName: displayName || undefined,
			bio: bio || undefined,
		});
	};

	const handleCancel = () => {
		setIsEditing(false);
	};

	return (
		<div className="container mx-auto max-w-2xl p-4">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>My Profile</CardTitle>
							<CardDescription>@{user.username}</CardDescription>
						</div>
						{!isEditing && (
							<Button variant="outline" onClick={handleStartEditing}>
								Edit Profile
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{isEditing ? (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="displayName">Display Name</Label>
								<Input
									id="displayName"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									placeholder="Your display name"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="bio">Bio</Label>
								<Input
									id="bio"
									value={bio}
									onChange={(e) => setBio(e.target.value)}
									placeholder="Tell us about yourself"
								/>
							</div>

							<div className="flex gap-2">
								<Button
									onClick={handleSave}
									disabled={updateMutation.isPending}
								>
									{updateMutation.isPending ? "Saving..." : "Save"}
								</Button>
								<Button
									variant="outline"
									onClick={handleCancel}
									disabled={updateMutation.isPending}
								>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							<div>
								<h3 className="font-medium text-muted-foreground text-sm">
									Display Name
								</h3>
								<p className="text-lg">{user.displayName || "-"}</p>
							</div>

							<div>
								<h3 className="font-medium text-muted-foreground text-sm">
									Bio
								</h3>
								<p>{user.bio || "No bio yet"}</p>
							</div>

							<div>
								<h3 className="font-medium text-muted-foreground text-sm">
									Email
								</h3>
								<p>{user.email || "-"}</p>
							</div>

							<div>
								<h3 className="font-medium text-muted-foreground text-sm">
									Wallet
								</h3>
								<p className="font-mono text-sm">
									{user.walletAddress || "No wallet connected"}
								</p>
							</div>

							<div className="grid grid-cols-3 gap-4 border-t pt-4">
								<div className="text-center">
									<p className="font-bold text-2xl">{user.postsCount}</p>
									<p className="text-muted-foreground text-sm">Posts</p>
								</div>
								<div className="text-center">
									<p className="font-bold text-2xl">{user.followersCount}</p>
									<p className="text-muted-foreground text-sm">Followers</p>
								</div>
								<div className="text-center">
									<p className="font-bold text-2xl">{user.followingCount}</p>
									<p className="text-muted-foreground text-sm">Following</p>
								</div>
							</div>
						</div>
					)}

					<div className="border-t pt-4">
						<Button variant="destructive" onClick={auth.logout}>
							Sign Out
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
