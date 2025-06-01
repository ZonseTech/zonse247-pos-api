import os from 'os';
import { exec } from 'child_process';
import { Printer, PrinterInfo } from '@/types';

export function getAllPrinters(): Promise<Printer[]> {
	return new Promise((resolve) => {
		const platform = os.platform();

		if (platform === 'win32') {
			exec(
				'powershell.exe -command "Get-Printer | ConvertTo-Json"',
				(error, stdout) => {
					if (error) {
						console.error(`Error: ${error.message}`);
						return resolve([]);
					}

					try {
						const printerData = JSON.parse(stdout);
						const printers = Array.isArray(printerData)
							? printerData
							: [printerData];

						exec(
							'powershell.exe -command "(Get-WmiObject -Class Win32_Printer -Property Default | Where-Object {$_.Default -eq $true}).Name"',
							(defError, defStdout) => {
								const defaultPrinterName = defError ? '' : defStdout.trim();

								const formattedPrinters: Printer[] = printers.map(
									(printer) => ({
										name: printer.Name || '',
										status: printer.PrinterStatus || 'Unknown',
										isDefault: printer.Name === defaultPrinterName,
										location: printer.Location || undefined,
										model: printer.DriverName || undefined,
									})
								);

								resolve(formattedPrinters);
							}
						);
					} catch (e) {
						console.error('Failed to parse printer data:', e);
						resolve([]);
					}
				}
			);
		} else if (platform === 'darwin') {
			exec('lpstat -p', (error, stdout) => {
				if (error) {
					console.error(`Error: ${error.message}`);
					return resolve([]);
				}

				exec('lpstat -d', (defError, defStdout) => {
					const defaultMatch = defError
						? null
						: /^system default destination: (.+)$/.exec(defStdout);
					const defaultPrinter = defaultMatch ? defaultMatch[1] : '';

					const printers: Printer[] = [];
					const printerLines = stdout.split('\n').filter(Boolean);

					printerLines.forEach((line) => {
						const match = /^printer ([\w\-_.]+)/.exec(line);
						if (match) {
							const name = match[1];
							let status = 'Unknown';

							if (line.includes('enabled')) {
								status = 'Ready';
							} else if (line.includes('disabled')) {
								status = 'Offline';
							}

							printers.push({
								name,
								status,
								isDefault: name === defaultPrinter,
							});
						}
					});

					resolve(printers);
				});
			});
		} else {
			exec('lpstat -a', (error, stdout) => {
				if (error) {
					console.error(`Error: ${error.message}`);
					return resolve([]);
				}

				exec('lpstat -d', (defError, defStdout) => {
					const defaultMatch = defError
						? null
						: /^system default destination: (.+)$/.exec(defStdout);
					const defaultPrinter = defaultMatch ? defaultMatch[1] : '';

					const printers: Printer[] = [];
					const printerLines = stdout.split('\n').filter(Boolean);

					printerLines.forEach((line) => {
						const match = /^([\w\-_.]+)/.exec(line);
						if (match) {
							const name = match[1];
							let status = 'Unknown';

							if (line.includes('accepting requests')) {
								status = 'Ready';
							} else {
								status = 'Offline';
							}

							printers.push({
								name,
								status,
								isDefault: name === defaultPrinter,
							});
						}
					});

					resolve(printers);
				});
			});
		}
	});
}

export function printDirectly(
	html: string,
	printerOptions?: PrinterInfo
): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		try {
			console.log('Creating browser window for printing');
			// const win = new BrowserWindow({
			// 	width: 800,
			// 	height: 600,
			// 	show: false,
			// 	webPreferences: {
			// 		nodeIntegration: false,
			// 		contextIsolation: true,
			// 	},
			// });

			// const timeoutId = setTimeout(() => {
			// 	console.warn('Print window timed out');
			// 	try {
			// 		if (!win.isDestroyed()) win.close();
			// 	} catch (e) {
			// 		//
			// 	}
			// 	resolve(false);
			// }, 25000);

			// win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

			// win.webContents.on('did-finish-load', () => {
			// 	console.log('Print window loaded, sending print job');

			// 	try {
			// 		win.webContents.print(
			// 			{
			// 				silent: true,
			// 				printBackground: true,
			// 				deviceName: printerOptions.name,
			// 				margins: {
			// 					marginType: 'none',
			// 				},
			// 				pageSize: 'A5',
			// 				landscape: false,
			// 				copies: 1,
			// 				scaleFactor: 100,
			// 				dpi: {
			// 					horizontal: 300,
			// 					vertical: 300,
			// 				},
			// 			},
			// 			(success, errorType) => {
			// 				clearTimeout(timeoutId);

			// 				if (!success) {
			// 					console.error('Print failed with error type:', errorType);
			// 				} else {
			// 					console.log('Print job successful');
			// 				}

			// 				try {
			// 					if (!win.isDestroyed()) win.close();
			// 				} catch (e) {
			// 					console.error('Error closing window:', e);
			// 				}

			// 				resolve(success);
			// 			}
			// 		);
			// 	} catch (err) {
			// 		clearTimeout(timeoutId);
			// 		console.error('Error during print operation:', err);
			// 		try {
			// 			if (!win.isDestroyed()) win.close();
			// 		} catch (e) {
			// 			//
			// 		}
			// 		resolve(false);
			// 	}
			// });

			// win.webContents.on(
			// 	'did-fail-load',
			// 	(event, errorCode, errorDescription) => {
			// 		clearTimeout(timeoutId);
			// 		console.error('Failed to load HTML for printing:', errorDescription);
			// 		try {
			// 			if (!win.isDestroyed()) win.close();
			// 		} catch (e) {
			// 			//
			// 		}
			// 		resolve(false);
			// 	}
			// );
		} catch (error) {
			console.error('Error creating print window:', error);
			resolve(false);
		}
	});
}
