import { Request, Response, Router } from 'express';
import bodyParser from 'body-parser';
import multer, { MulterError } from 'multer';
import sanitizeFilename from 'sanitize-filename';
import fs from 'fs';
import path from 'path';
import validator from 'validator';
import { SETTINGS_DB } from '../databases/local/tables';
import { sealDBModel } from '../databases/local';
import { v4 as uuidv4 } from 'uuid';
import { filterFile } from '../utils';
import { Setting } from '@/types';

const router = Router();

const maxFileSize = 2097152;
const defaultLogoName = 'logo';
const appName: string = process.env.APPNAME || '';
const appData: string = process.env.APPDATA || '';

const storage = multer.diskStorage({
	destination: path.join(appData, appName, 'uploads'),
	filename: function (
		req: Express.Request,
		file: Express.Multer.File,
		callback: (error: Error | null, filename: string) => void
	) {
		callback(null, defaultLogoName + path.extname(file.originalname));
	},
});

const upload = multer({
	storage: storage,
	limits: { fileSize: maxFileSize },
	fileFilter: filterFile,
}).single('imagename');

router.use(bodyParser.json());

router.get('/', function (req: Request, res: Response): void {
	res.send('Settings API');
});

router.get('/get', async function (req: Request, res: Response): Promise<void> {
	try {
		const settings = await sealDBModel.findAll(SETTINGS_DB);
		res.send(settings[0]);
	} catch (error: any) {
		res.status(500).json({
			error: 'Internal Server Error',
			message: error.message,
		});
	}
});

router.post(
	'/post',
	async function (req: Request, res: Response): Promise<void> {
		upload(req, res, async function (err) {
			const typedReq = req;

			if (err) {
				if (err instanceof MulterError) {
					console.error('Upload Error:', err);
					return res.status(400).json({
						error: 'Upload Error',
						message: err.message,
					});
				} else {
					return res.status(500).json({
						error: 'Internal Server Error',
						message: err.message,
					});
				}
			}

			let image = '';

			if (validator.escape(typedReq.body.img) !== '') {
				image = sanitizeFilename(typedReq.body.img);
			}

			if (typedReq.file) {
				image = sanitizeFilename(typedReq.file.filename);
			}

			if (validator.escape(typedReq.body.remove) === '1') {
				try {
					const imgPath = path.join(appData, appName, 'uploads', image);

					if (!typedReq.file) {
						fs.unlinkSync(imgPath);
						image = '';
					}
				} catch (err: any) {
					return res.status(500).json({
						error: 'Internal Server Error',
						message: err.message,
					});
				}
			}

			const uuid = typedReq.body.uuid || uuidv4();

			const newSettings: Setting = {
				uuid,
				app: validator.escape(typedReq.body.app),
				store: validator.escape(typedReq.body.store),
				addressOne: validator.escape(typedReq.body.addressOne),
				addressTwo: validator.escape(typedReq.body.addressTwo),
				contact: validator.escape(typedReq.body.contact),
				tax: validator.escape(typedReq.body.tax),
				symbol: validator.escape(typedReq.body.symbol),
				percentage: validator.escape(typedReq.body.percentage),
				chargeTax: typedReq.body.chargeTax === 'on',
				footer: validator.escape(typedReq.body.footer),
				tillName: validator.escape(typedReq.body.tillName),
				img: image,
			};

			try {
				if (validator.escape(typedReq.body.uuid) === '') {
					const insertedSettings = await sealDBModel.insert(
						SETTINGS_DB,
						newSettings
					);
					res.status(200).json(insertedSettings);
				} else {
					const numReplaced = await sealDBModel.update(
						SETTINGS_DB,
						uuid,
						newSettings
					);
					if (numReplaced > 0) {
						res.status(200).json(newSettings);
					} else {
						res.status(404).json({
							error: 'Not Found',
							message: 'Settings not found',
						});
					}
				}
			} catch (error: any) {
				res.status(500).json({
					error: 'Internal Server Error',
					message: error.message,
				});
			}
		});
	}
);

export default router;
