import os from 'os';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Request, Response, Router } from 'express';
import { generateTransactionHtml } from '../lib/receipt-format';
import { printDirectly, getAllPrinters } from '../lib/printer-manager';
import { Printer, PrinterInfo } from '@/types';

const router = Router();
const appName = process.env.APPNAME || '';
const appData = process.env.APPDATA || '';

let lastCacheTime = 0;
const CACHE_TTL = 30000;
let printerCache: Array<Printer> = [];

router.get('/all', async function (req: Request, res: Response): Promise<void> {
	try {
		const currentTime = Date.now();

		if (currentTime - lastCacheTime > CACHE_TTL || printerCache.length === 0) {
			printerCache = await getAllPrinters();
			lastCacheTime = currentTime;
		}

		if (appData && appName) {
			try {
				const dataDir = path.join(appData, appName);

				if (!fs.existsSync(dataDir)) {
					fs.mkdirSync(dataDir, { recursive: true });
				}

				fs.writeFileSync(
					path.join(dataDir, 'printers.json'),
					JSON.stringify(printerCache, null, 2)
				);
			} catch (err) {
				console.error('Failed to save printer data to file:', err);
			}
		}

		res.status(200).json(printerCache);
	} catch (error) {
		console.error('Error fetching printers:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch printer data',
		});
	}
});

router.post(
	'/set-default',
	async function (req: Request, res: Response): Promise<any> {
		const { name } = req.body;

		if (!name) {
			return res.status(400).json({
				success: false,
				error: 'Printer name is required',
			});
		}

		try {
			const platform = os.platform();

			if (platform === 'win32') {
				exec(
					`powershell.exe -command "(Get-WmiObject -Class Win32_Printer | Where-Object {$_.Name -eq '${name}'}).SetDefaultPrinter()"`,
					(error) => {
						if (error) {
							console.error(`Error setting default printer: ${error.message}`);
							return res.status(500).json({
								success: false,
								error: 'Failed to set default printer',
							});
						}

						res.status(200).json({
							success: true,
							message: 'Default printer set successfully',
						});
					}
				);
			} else if (platform === 'darwin') {
				exec(`lpoptions -d ${name}`, (error) => {
					if (error) {
						console.error(`Error setting default printer: ${error.message}`);
						return res.status(500).json({
							success: false,
							error: 'Failed to set default printer',
						});
					}

					res.status(200).json({
						success: true,
						message: 'Default printer set successfully',
					});
				});
			} else {
				res.status(400).json({
					success: false,
					error: 'Unsupported platform',
				});
			}
		} catch (error) {
			console.error('Error setting default printer:', error);
			res.status(500).json({
				success: false,
				error: 'Failed to set default printer',
			});
		}
	}
);

router.post(
	'/print-receipt',
	async function (req: Request, res: Response): Promise<any> {
		const transaction = req.body.transaction;
		const options = req.body.options as PrinterInfo;
		const settings = req.body.settings;

		if (!transaction) {
			return res.status(400).json({
				success: false,
				error: 'Transaction data is required',
			});
		}

		try {
			console.log(
				'Received print request for transaction:',
				transaction.id || 'unknown'
			);

			getAllPrinters().catch((err) =>
				console.error('Error getting printers:', err)
			);

			const html = generateTransactionHtml(transaction, settings);

			const printResultPromise = Promise.race([
				printDirectly(html, options),
				new Promise<boolean>((resolve) =>
					setTimeout(() => {
						console.warn('Print operation timed out');
						resolve(false);
					}, 30000)
				),
			]);

			const printResult = await printResultPromise;

			if (printResult) {
				console.log('Print successful');
				return res.status(200).json({
					success: true,
					message: 'Print job sent successfully',
					printer: options?.name || 'default',
				});
			} else {
				console.log('Print failed');
				return res.status(500).json({
					success: false,
					error: 'Failed to send print job',
				});
			}
		} catch (error) {
			console.error('Error printing transaction:', error);
			return res.status(500).json({
				success: false,
				error: 'Failed to send print job',
				details: error instanceof Error ? error.message : String(error),
			});
		}
	}
);

export default router;
