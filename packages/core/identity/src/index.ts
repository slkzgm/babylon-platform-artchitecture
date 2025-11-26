// Types
export * from "./types";

// Use cases
export { type CreateUserParams, createUser } from "./use-cases/create-user";
export {
	findUserByPrivyId,
	getUserById,
	getUserByPrivyId,
	getUserByUsername,
	getUserWithSettings,
	isUsernameAvailable,
} from "./use-cases/get-user";
export {
	linkWallet,
	updateProfile,
	updateSettings,
} from "./use-cases/update-profile";
