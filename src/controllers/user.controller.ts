import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { LoginResponse } from '@/types';

export class UserController {
	private userService: UserService;

	constructor() {
		this.userService = new UserService();
	}

	getHealthCheck = (req: Request, res: Response): void => {
		res.send('Users API');
	};

	getUserById = async (req: Request, res: Response): Promise<void> => {
		try {
			const user = await this.userService.getUserById(req.params.userId);
			res.send(user);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: error.message || `An unexpected error occurred. ${error}`,
			});
		}
	};

	logoutUser = async (req: Request, res: Response): Promise<void> => {
		try {
			await this.userService.logoutUser(req.params.userId);
			res.sendStatus(200);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: error.message || `An unexpected error occurred. ${error}`,
			});
		}
	};

	loginUser = async (req: Request, res: Response): Promise<void> => {
		try {
			const { username, password } = req.body;
			const result = await this.userService.loginUser(username, password);
			res.send(result as LoginResponse);
		} catch (error: any) {
			console.error(error);
			res.send({ message: error?.message } as LoginResponse);
		}
	};

	getAllUsers = async (req: Request, res: Response): Promise<void> => {
		try {
			const users = await this.userService.getAllUsers();
			res.send(users);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: error.message || `An unexpected error occurred. ${error}`,
			});
		}
	};

	deleteUser = async (req: Request, res: Response): Promise<void> => {
		try {
			await this.userService.deleteUser(req.params.userId);
			res.sendStatus(200);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: error.message || `An unexpected error occurred. ${error}`,
			});
		}
	};

	createUser = async (req: Request, res: Response): Promise<void> => {
		try {
			const user = await this.userService.createUser(req.body);
			res.send(user);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: error.message || `An unexpected error occurred. ${error}`,
			});
		}
	};

	updateUser = async (req: Request, res: Response): Promise<void> => {
		try {
			const userData = await this.userService.updateUser(
				req.params.userId,
				req.body
			);
			res.status(200).json(userData);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: error.message || `An unexpected error occurred. ${error}`,
			});
		}
	};
}
