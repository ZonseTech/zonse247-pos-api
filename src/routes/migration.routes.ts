import multer from 'multer';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { MigrationController } from '../controllers/migration.controller';

const router = Router();
const migrationController = new MigrationController();

const UPLOAD_DIR = process.env.UPLOAD_PATH || './.backups/uploads';

const ensureUploadDirectory = (): void => {
	try {
		const absolutePath = path.resolve(UPLOAD_DIR);
		if (!fs.existsSync(absolutePath)) {
			fs.mkdirSync(absolutePath, { recursive: true });
			console.log(`Created upload directory: ${absolutePath}`);
		}
	} catch (error) {
		console.error('Failed to create upload directory:', error);
		throw new Error('Unable to initialize upload directory');
	}
};

ensureUploadDirectory();

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		try {
			const absolutePath = path.resolve(UPLOAD_DIR);
			if (!fs.existsSync(absolutePath)) {
				fs.mkdirSync(absolutePath, { recursive: true });
			}
			cb(null, UPLOAD_DIR);
		} catch (error) {
			cb(error as Error, '');
		}
	},
	filename: (req, file, cb) => {
		try {
			const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
			const filename = `${Date.now()}-${sanitizedName}`;
			cb(null, filename);
		} catch (error) {
			cb(error as Error, '');
		}
	},
});

const upload = multer({
	storage,
	fileFilter: (req, file, cb) => {
		try {
			const allowedTypes = ['.db', '.json', '.csv'];
			const fileExt = file.originalname
				.toLowerCase()
				.substring(file.originalname.lastIndexOf('.'));

			if (allowedTypes.includes(fileExt)) {
				cb(null, true);
			} else {
				cb(new Error('Invalid file type. Only .db, .json, and .csv files are allowed.'));
			}
		} catch (error) {
			cb(error, false);
		}
	},
	limits: {
		fileSize: 50 * 1024 * 1024,
	},
});

const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction): void => {
	if (error instanceof multer.MulterError) {
		switch (error.code) {
			case 'LIMIT_FILE_SIZE':
				res.status(400).json({
					error: 'File too large',
					message: 'File size cannot exceed 50MB'
				});
				return;
			case 'LIMIT_FILE_COUNT':
				res.status(400).json({
					error: 'Too many files',
					message: 'Only one file can be uploaded at a time'
				});
				return;
			case 'LIMIT_UNEXPECTED_FILE':
				res.status(400).json({
					error: 'Unexpected file field',
					message: 'File must be uploaded with field name "file"'
				});
				return;
			default:
				res.status(400).json({
					error: 'Upload error',
					message: error.message
				});
				return;
		}
	}

	if (error) {
		res.status(400).json({
			error: 'Upload failed',
			message: error.message
		});
		return;
	}

	next();
};

router.post('/upload', upload.single('file'), handleUploadError, migrationController.uploadFile);
router.post('/migrate', migrationController.startMigration);
router.get('/progress', migrationController.getMigrationProgress);
router.post('/map-data', migrationController.startMappingData);
router.get('/reset', migrationController.resetMigration);

export default router;