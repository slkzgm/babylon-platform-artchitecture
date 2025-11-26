"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

if (!PRIVY_APP_ID) {
	throw new Error(
		"NEXT_PUBLIC_PRIVY_APP_ID is missing. Add it to the root .env before starting the web app.",
	);
}

export function PrivyProvider({ children }: { children: React.ReactNode }) {
	return (
		<BasePrivyProvider
			appId={PRIVY_APP_ID}
			config={{
				appearance: {
					theme: "dark",
					accentColor: "#676FFF",
					showWalletLoginFirst: false,
				},
				embeddedWallets: {
					ethereum: {
						createOnLogin: "all-users",
					},
				},
				loginMethods: ["farcaster", "wallet", "twitter", "email"],
			}}
		>
			<SmartWalletsProvider>{children}</SmartWalletsProvider>
		</BasePrivyProvider>
	);
}
