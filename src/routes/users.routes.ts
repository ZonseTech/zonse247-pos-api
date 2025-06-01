import { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { USERS_DB } from '../databases/local/tables';
import { sealDBModel } from '../databases/local';
import { v4 as uuidv4 } from 'uuid';
import { LoginResponse, User, UserInput } from '@/types';

const router = Router();
const saltRounds = 10;

router.get('/', (req: Request, res: Response): void => {
	res.send('Users API');
});

router.get(
	'/user/:userId',
	async (req: Request, res: Response): Promise<void> => {
		if (!req.params.userId) {
			res.status(500).send('ID field is required.');
			return;
		}

		try {
			const user = await sealDBModel.findById(USERS_DB, req.params.userId);
			res.send(user);
		} catch (error) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: `An unexpected error occurred. ${error}`,
			});
		}
	}
);

router.get(
	'/logout/:userId',
	async (req: Request, res: Response): Promise<void> => {
		if (!req.params.userId) {
			res.status(500).send('ID field is required.');
			return;
		}

		try {
			await sealDBModel.update(USERS_DB, req.params.userId, {
				lastLoggedOut: new Date(),
			});
			res.sendStatus(200);
		} catch (error) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: `An unexpected error occurred. ${error}`,
			});
		}
	}
);

router.post('/login', async (req: Request, res: Response): Promise<void> => {
	try {
		const users: Array<User> = await sealDBModel.find(USERS_DB, {
			username: validator.escape(req.body.username),
		});

		const user: any = users[0];

		if (user) {
			const result = await bcrypt.compare(req.body.password, user.password);

			if (result) {
				await sealDBModel.update(USERS_DB, user.uuid.toString(), {
					lastLogin: new Date(),
				});

				delete user.password;

				const token = bcrypt.hashSync(JSON.stringify(user), saltRounds);

				res.send({ user: { ...user }, token } as LoginResponse);
			} else {
				res.send({
					message: 'Something went wrong. Try again later.',
				} as LoginResponse);
			}
		} else {
			res.send({
				message: 'Incorrect username or password.',
			} as LoginResponse);
		}
	} catch (error: any) {
		console.error(error);
		res.send({ message: error?.message } as LoginResponse);
	}
});

router.get('/all', async (req: Request, res: Response): Promise<void> => {
	try {
		const users = await sealDBModel.findAll(USERS_DB);
		res.send(users);
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: `An unexpected error occurred. ${error}`,
		});
	}
});

router.delete(
	'/user/:userId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			await sealDBModel.delete(USERS_DB, req.params.userId);
			res.sendStatus(200);
		} catch (error) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: `An unexpected error occurred. ${error}`,
			});
		}
	}
);

router.post('/post', async (req: Request, res: Response): Promise<void> => {
	try {
		const hash = await bcrypt.hash(req.body.password, saltRounds);
		req.body.password = hash;

		const userData: UserInput = {
			...req.body,
			status: 'active',
		};

		delete userData.repeatPassword;

		const newUser = {
			...userData,
			uuid: uuidv4(),
		} as User;

		const user = await sealDBModel.insert(USERS_DB, newUser);
		delete user.password;
		res.send(user);
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: `An unexpected error occurred. ${error}`,
		});
	}
});

router.put(
	'/update/:userId',
	async (req: Request, res: Response): Promise<void> => {
		if (!req.params.userId) {
			res.status(500).send('ID field is required.');
			return;
		}

		try {
			const hash = await bcrypt.hash(req.body.password, saltRounds);
			req.body.password = hash;

			const userData = {
				...req.body,
			};

			delete userData.repeatPassword;

			await sealDBModel.update(USERS_DB, req.body.uuid, userData);
			delete userData.password;
			res.status(200).json(userData);
		} catch (error) {
			console.error(error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: `An unexpected error occurred. ${error}`,
			});
		}
	}
);

export default router;
