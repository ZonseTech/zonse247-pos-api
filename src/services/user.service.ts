import bcrypt from 'bcryptjs';
import validator from 'validator';
import { USERS_DB } from '../databases/local/tables';
import { sealDBModel } from '../databases/local';
import { v4 as uuidv4 } from 'uuid';
import { User, UserInput } from '@/types';

const saltRounds = 10;

export class UserService {
	async getUserById(userId: string): Promise<any> {
		if (!userId) {
			throw new Error('ID field is required.');
		}

		return await sealDBModel.findById(USERS_DB, userId);
	}

	async logoutUser(userId: string): Promise<void> {
		if (!userId) {
			throw new Error('ID field is required.');
		}

		await sealDBModel.update(USERS_DB, userId, {
			lastLoggedOut: new Date(),
		});
	}

	async loginUser(
		username: string,
		password: string
	): Promise<{ user?: any; token?: string; message?: string }> {
		const users: Array<User> = await sealDBModel.find(USERS_DB, {
			username: validator.escape(username),
		});

		const user: any = users[0];

		if (!user) {
			return { message: 'Incorrect username or password.' };
		}

		if (user.status !== 'active') {
			return { message: 'Account is not active. Please contact support.' };
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			return { message: 'Incorrect username or password.' };
		}

		await sealDBModel.update(USERS_DB, user.uuid.toString(), {
			lastLogin: new Date(),
		});

		delete user.password;

		const token = this.generateJWTToken(user);

		return { user: { ...user }, token };
	}

	private generateJWTToken(user: any): string {
		// This would typically use a proper JWT library
		// For now, using the existing bcrypt approach but should be replaced with JWT
		return bcrypt.hashSync(JSON.stringify(user), saltRounds);
	}

	async checkUserExists(username: string, email: string): Promise<boolean> {
		const existingUsers = await sealDBModel.find(USERS_DB, {
			$or: [
				{ username: validator.escape(username) },
				{ email: validator.escape(email) },
			],
		});

		return existingUsers.length > 0;
	}

	async getAllUsers(): Promise<any[]> {
		return await sealDBModel.findAll(USERS_DB);
	}

	async deleteUser(userId: string): Promise<void> {
		if (!userId) {
			throw new Error('ID field is required.');
		}

		await sealDBModel.delete(USERS_DB, userId);
	}

	async createUser(userData: UserInput): Promise<any> {
		const userExists = await this.checkUserExists(
			userData.username,
			userData.email!
		);
		if (userExists) {
			throw new Error('User with this username or email already exists');
		}

		const hash = await bcrypt.hash(userData.password, saltRounds);

		const newUserData: UserInput = {
			...userData,
			password: hash,
			status: 'active',
		};

		delete newUserData.repeatPassword;

		const newUser = {
			...newUserData,
			uuid: uuidv4(),
			createdAt: new Date(),
			updatedAt: new Date(),
		} as User;

		const user = await sealDBModel.insert(USERS_DB, newUser);
		delete user.password;

		return user;
	}

	async updateUser(userId: string, userData: any): Promise<any> {
		if (!userId) {
			throw new Error('ID field is required.');
		}

		const existingUser = await sealDBModel.findById(USERS_DB, userId);
		if (!existingUser) {
			throw new Error('User not found');
		}

		const updatedUserData: any = { ...userData };

		if (userData.password) {
			const hash = await bcrypt.hash(userData.password, saltRounds);
			updatedUserData.password = hash;
		}

		delete updatedUserData.repeatPassword;
		updatedUserData.updatedAt = new Date();

		await sealDBModel.update(USERS_DB, userId, updatedUserData);
		delete updatedUserData.password;

		return updatedUserData;
	}
}
