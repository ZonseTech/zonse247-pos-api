import { Request } from 'express';
import fs from 'fs';
import crypto from 'crypto';
import { User } from 'users';
import { InputJsonValue } from '../databases/prisma/generated/prisma/internal/prismaNamespace';

const VALID_FILE_TYPES = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp'];

interface File {
	mimetype: string;
}

export const hasPermission = (user: User, permField: string) => {
	if (!user) return false;
	return user?.permissions?.includes(permField);
};

export const hasRole = (user: User, role: string) => {
	if (!user) return false;
	return user?.roleName === role;
};


export const toJsonValue = <T extends object>(obj: T): InputJsonValue => {
	return obj as unknown as InputJsonValue;
};

export const hasAnyPermission = (user: User, permissions: Array<string>) => {
	return permissions.some(permission => hasPermission(user, permission));
};

export const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('en-US', {
		style: 'decimal',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
		.format(amount || 0)
		.replace(/^/, 'MK');
};

const checkFileType = (fileType: string, validFileTypes: string[]) => {
	return validFileTypes.includes(fileType);
};

export function getFileHash(filePath: string): string {
	const content = fs.readFileSync(filePath, 'utf8');
	return crypto.createHash('sha256').update(content).digest('base64');
}

export const formatDate = (dateString: string) => {
	const date = new Date(dateString);
	return date.toLocaleString('en-US', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour12: false,
	});
};

export const filterFile = (
	req: Request,
	file: File,
	callback: (error: Error | null, acceptFile?: boolean) => void
) => {
	try {
		const isValidFile = checkFileType(file.mimetype, VALID_FILE_TYPES);

		if (isValidFile) {
			return callback(null, true);
		} else {
			return callback(
				new Error(
					`Invalid file type. Only JPEG, PNG, GIF, and WEBP files are allowed.`
				),
				false
			);
		}
	} catch (err) {
		return callback(new Error(`An error occurred: ${err}`), false);
	}
};

export const generateReferenceNumber = () => {
	const generateString = [];

	const ALPHABET = [
		'a',
		'b',
		'c',
		'd',
		'e',
		'f',
		'g',
		'h',
		'i',
		'j',
		'k',
		'l',
		'm',
		'n',
		'o',
		'p',
		'r',
		's',
		't',
		'u',
		'v',
		'w',
		'x',
		'y',
		'z',
	];

	const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

	const MONTHS = [
		'1',
		'2',
		'3',
		'4',
		'5',
		'6',
		'7',
		'8',
		'9',
		'10',
		'11',
		'12',
	];

	const CAPITALIZED_ALPHABET = ALPHABET.map((letter) => letter.toUpperCase());

	const ALPHA_NUMERIC_POOL = [...CAPITALIZED_ALPHABET, ...NUMBERS];

	for (let i = 0; i < 7; i++) {
		const value: string | number =
			ALPHA_NUMERIC_POOL[
			Math.floor(Math.random() * ALPHA_NUMERIC_POOL.length + 0)
			];
		generateString.push(value);
	}

	const date = new Date();
	const year = date.getFullYear();
	const month = MONTHS[date.getMonth()];

	return `${generateString.join('')}-${year}-${month}`;
};

export const toCamelCase = (obj: any): any => {
	if (Array.isArray(obj)) {
		return obj.map((v) => toCamelCase(v));
	} else if (obj !== null && obj !== undefined && typeof obj === 'object') {
		return Object.keys(obj).reduce((result, key) => {
			const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
				letter.toUpperCase()
			);
			result[camelKey] = toCamelCase(obj[key]);
			return result;
		}, {} as any);
	}
	return obj;
};

export const toSnakeCase = (obj: any): any => {
	if (Array.isArray(obj)) {
		return obj.map((v) => toSnakeCase(v));
	} else if (obj !== null && obj !== undefined && typeof obj === 'object') {
		return Object.keys(obj).reduce((result, key) => {
			const snakeKey = key.replace(
				/[A-Z]/g,
				(letter) => `_${letter.toLowerCase()}`
			);
			result[snakeKey] = toSnakeCase(obj[key]);
			return result;
		}, {} as any);
	}
	return obj;
};

export function isElectron() {
	return !!(
		(typeof process !== 'undefined' && process.versions && process.versions.electron) ||
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Electron'))
	);
}