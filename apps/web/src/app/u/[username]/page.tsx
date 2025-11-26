"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Loader from "@/components/loader";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ApiRequestError, identity } from "@/lib/api";

export default function PublicProfilePage() {
	const params = useParams<{ username: string }>();
	const username = params.username;

	const {
		data: user,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["user", username],
		queryFn: () => identity.getUserByUsername(username),
		enabled: !!username,
		retry: false,
	});

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader />
			</div>
		);
	}

	if (error) {
		const isNotFound = error instanceof ApiRequestError && error.status === 404;

		return (
			<div className="flex h-full items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>{isNotFound ? "User Not Found" : "Error"}</CardTitle>
						<CardDescription>
							{isNotFound
								? `The user @${username} doesn't exist or has been removed.`
								: "Something went wrong. Please try again."}
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className="container mx-auto max-w-2xl p-4">
			<Card>
				<CardHeader>
					<CardTitle>{user.displayName || user.username}</CardTitle>
					<CardDescription>@{user.username}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div>
						<h3 className="font-medium text-muted-foreground text-sm">Bio</h3>
						<p>{user.bio || "No bio yet"}</p>
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

					<div className="border-t pt-4 text-muted-foreground text-sm">
						Member since {new Date(user.createdAt).toLocaleDateString()}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
