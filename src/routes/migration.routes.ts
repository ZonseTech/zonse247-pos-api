import multer from 'multer';
import { Router } from 'express';
import { MigrationController } from '../controllers/Migration.controller';

const router = Router();
const migrationController = new MigrationController();

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads/migrations/');
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});

const upload = multer({
	storage,
	fileFilter: (req, file, cb) => {
		const allowedTypes = ['.db', '.json', '.csv'];
		const fileExt = file.originalname
			.toLowerCase()
			.substring(file.originalname.lastIndexOf('.'));

		if (allowedTypes.includes(fileExt)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					'Invalid file type. Only .db, .json, and .csv files are allowed.'
				)
			);
		}
	},
	limits: {
		fileSize: 50 * 1024 * 1024,
	},
});

router.post(
	'/upload',
	upload.single('file'),
	migrationController.uploadFile as any
);
router.post('/migrate', migrationController.startMigration as any);
router.get('/progress', migrationController.getMigrationProgress);
router.get('/reset', migrationController.resetMigration);

export default router;
