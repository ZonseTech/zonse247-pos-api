export interface SyncResult {
	success: boolean;
	recordCount: number;
	errors: string[];
	timestamp: string;
}

export interface User {
	id?: string;
	uuid: string;
	username: string;
	password: string;
	repeatPassword?: string;
	fullname: string;
	status?: string;
	permProducts?: number;
	permCategories?: number;
	permTransactions?: number;
	permUsers?: number;
	permSettings?: number;
	createdAt?: Date;
	updatedAt?: Date;
	synced?: 1 | 0;
}

export interface Customer {
	uuid: string;
	name: string;
	phone?: string;
	email?: string;
	address?: string;
	synced?: 0 | 1;
}

export interface Category {
	uuid: string;
	name: string;
	createdAt?: string;
	updateAt?: string;
	synced?: 1 | 0;
}

export interface PaymentMethodData {
	uuid: string;
	name: string;
	createdAt?: string;
	updateAt?: string;
	synced?: 1 | 0;
}

export interface LoginResponse {
	token: string;
	message?: string;
	user: User;
}

export interface UserInput extends Omit<User, 'uuid'> {
	uuid: string;
	pass?: string;
	[key: string]: unknown;
}

export interface PrinterInfo {
	description: string;
	displayName: string;
	isDefault: boolean;
	name: string;
	options: any;
	status: number;
}

export interface SalesData {
	name: string;
	sales: number;
	prescriptions: number;
}

export interface CategoryData {
	name: string;
	value: number;
}

export interface HourlyData {
	hour: string;
	sales: number;
	prescriptions: number;
}

export interface ProductData {
	id: number;
	name: string;
	type: 'Prescription' | 'OTC' | 'Supplement';
	sales: number;
	revenue: number;
}

export interface InsuranceData {
	name: string;
	value: number;
}

export interface InventoryAlertData {
	id: number;
	name: string;
	current: number;
	threshold: number;
}

export interface StatCardProps {
	title: string;
	value: string;
	icon: React.ReactNode;
	change: string;
	color: string;
}

export interface ChartPanelProps {
	title: string;
	children: React.ReactNode;
}

export interface TableHeader {
	name: string;
	align: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
	title: string;
	headers: TableHeader[];
	data: T[];
	renderRow: (item: T) => React.ReactNode;
	icon: React.ReactNode;
}

export interface AlertPanelProps {
	title: string;
	children: React.ReactNode;
	icon: React.ReactNode;
}

export interface ProgressBarProps {
	label: string;
	count: number;
	percentage: number;
	color: string;
}

export interface ClaimData {
	label: string;
	count: number;
	percentage: number;
	color: string;
}

export interface ExportOptions {
	format: 'json' | 'csv';
	includeMetadata?: boolean;
	dateRange?: {
		start: string;
		end: string;
		field: string;
	};
	limit?: number;
	offset?: number;
}

export interface TableStats {
	tableName: string;
	totalRecords: number;
	syncedRecords: number;
	unsyncedRecords: number;
	lastUpdated?: string;
}

export interface ExportOptions {
	format: 'json' | 'csv';
	includeMetadata?: boolean;
	dateRange?: {
		start: string;
		end: string;
		field: string;
	};
	limit?: number;
	offset?: number;
}

export interface ExportResult {
	tableName: string;
	recordCount: number;
	data: any[];
	exportedAt: string;
	format: string;
}

export interface ApiResponse<T> {
	success: boolean;
	data: T;
	message?: string;
}

export interface User {
	id?: string;
	uuid: string;
	username: string;
	email?: string;
	password: string;
	repeatPassword?: string;
	fullname: string;
	status?: string;
	permProducts?: number;
	permCategories?: number;
	permTransactions?: number;
	permUsers?: number;
	permSettings?: number;
	createdAt?: Date;
	updatedAt?: Date;
	synced?: 1 | 0;
}

export type TAuthTokenProps = {
	user: User;
};

export interface Till {
	id: number;
	uuid: string;
	name: string;
}

export type AuthUser = {
	user: User;
	token: string;
};

export type AuthProps = { username: string; password: string };

export interface LoginResponse {
	token: string;
	message?: string;
	user: User;
}

export interface UserInput extends Omit<User, 'uuid'> {
	uuid: string;
	pass?: string;
	[key: string]: unknown;
}

export type Mode = 'dark' | 'light' | string;

export interface TextInputProps {
	id?: string;
	name: string;
	label: string;
	type:
		| 'date'
		| 'email'
		| 'number'
		| 'password'
		| 'search'
		| 'tel'
		| 'text'
		| 'url'
		| 'time'
		| 'week'
		| 'month'
		| 'file'
		| 'checkbox'
		| 'datetime-local';
}

export interface Category {
	uuid: string;
	name: string;
	createdAt?: string;
	updateAt?: string;
	synced?: 1 | 0;
}

export type DataTypes = string | number | undefined | null | boolean;

export interface HoldOrder {
	uuid: string;
	reference: string;
	items: Array<CartItem>;
	total: number;
	totalItems: number;
	date: Date | string;
	status: string;
	userId?: string;
	till?: string;
}

export interface Product {
	id?: number | null;
	uuid: string;
	barcode: number | string;
	expirationDate?: string;
	createdAt?: string;
	updatedAt?: string;
	costPrice?: string;
	sellPrice?: string;
	promoPrice?: string;
	customPrice?: string;
	categoryId?: string;
	quantity?: string | number;
	orderItems?: number;
	originalQuantity?: number;
	name?: string;
	stock?: number;
	minStock?: string;
	status?: string;
	isExpired?: boolean;
	categoryDetails?: Category;
	synced?: 1 | 0;
}

export interface CartItem {
	barcode: number | string;
	productId: string;
	name: string;
	categoryId: string;
	sellPrice: number;
	purchasePrice: number;
	variancePrice?: number;
	quantity: number;
	categoryDetails?: Category;
}

export interface Setting {
	id?: number | null;
	uuid: string;
	app: string;
	store: string;
	addressOne: string;
	addressTwo: string;
	contact: string;
	tax: string;
	symbol: string;
	percentage: string;
	chargeTax: boolean;
	footer: string;
	img: string | null;
	remove?: string;
	file?: string;
	tillName?: string;
	synced?: 1 | 0;
}

export interface Settings {
	synced?: 1 | 0;
	uuid: string;
	settings: Setting;
}

export interface SettingsRequestBody {
	img: string;
	remove: string;
	app: string;
	store: string;
	addressOne: string;
	addressTwo: string;
	contact: string;
	tax: string;
	symbol: string;
	percentage: string;
	chargeTax: string;
	footer: string;
	tillName: string;
}

export interface Customer {
	uuid: string;
	name: string;
	phone?: string;
	email?: string;
	address?: string;
	synced?: 0 | 1;
}

export interface AppSettings {
	theme: 'light' | 'dark';
	apiUrl: string;
	features: {
		enableFeatureA: boolean;
		enableFeatureB: boolean;
	};
	version: string;
}

export type Transaction = {
	uuid: string;
	refNumber?: string;
	discount: number;
	customer?: Customer;
	customerId?: string;
	status?: string;
	subtotal: number;
	tax: number;
	date: string;
	createdAt?: string;
	updatedAt?: string;
	paymentId?: string;
	paymentMethod?: PaymentMethod;
	transactionId?: string;
	phoneNumber: string;
	serviceProviderId: number;
	total: number;
	paid: number;
	changeAmount: number;
	till: string;
	userId: string;
	items?: CartItem[];
	user?: User;
	synced?: 1 | 0;
};

export type OrderItem = {
	synced?: 1 | 0;
	uuid: string;
	productId: string;
	transactionId: string;
	quantity: number;
	purchasePrice: number;
	sellPrice: number;
	createdAt?: string;
};

export type ServiceProvider = {
	name: string;
	uuid: string;
};

export type TransactionValues = {
	paymentMethodId?: string;
	serviceProviderId?: number;
	transactionId?: string;
	phoneNumber?: string;
	amountPaid: string | number;
};

export type PaymentMethod = {
	uuid: string;
	name: string;
	icon?: string;
};

export interface Printer {
	name: string;
	status: string;
	isDefault: boolean;
	location?: string;
	model?: string;
}

export type CartTableFooterProps = {
	cart: Record[];
	discount: number;
	setDiscount: (value: number) => void;
	clearCart: () => void;
	subtotal: number;
	tax: number;
	total: number;
};

export type MonthlySales = {
	date: number;
	totalAmount: number;
};

export type TopProduct = {
	uuid: string;
	name: string;
	quantity: number;
	summedSellPrice: number;
	categoryName: string;
};

export type DashboardCounts = {
	totalSales: string;
	stock: number;
	totalUsers: number;
	allCustomers: number;
	expiredProducts: number;
	myTotalTransactions: number;
};

export interface MigrationProgress {
	table: string;
	status: 'pending' | 'processing' | 'completed' | 'error';
	message?: string;
	details?: string;
	recordCount?: number;
	timestamp: string;
}

export interface UploadStatus {
	type: 'success' | 'error';
	message: string;
	data?: MigrationUploadResponse;
}

export interface MigrationStats {
	total: number;
	completed: number;
	errors: number;
	progress: number;
}

export interface MigrationUploadResponse {
	recordCount: number;
	tableName: string;
	message: string;
}

export interface MigrationProgressItem {
	table?: string;
	status: 'completed' | 'error' | 'processing' | 'pending';
	message?: string;
	details?: string;
	timestamp: string;
	recordCount?: number;
}

export interface MigrationStats {
	total: number;
	completed: number;
	errors: number;
}

export interface MigrationProgressResponse {
	progress: MigrationProgressItem[];
	stats: MigrationStats;
	completed: boolean;
}

export interface MigrationStartRequest {
	fileName: string;
	tableName: string;
}

export interface Table {
	id: number | string;
	name: string;
	syncedDocs: number;
	lastSync: string;
	status: 'synced' | 'pending' | 'error' | 'syncing';
	description: string;
}

export interface SyncResponse {
	success: boolean;
	message: string;
	syncedDocs?: number;
	lastSync?: string;
	errors?: Array<string>;
}

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
}

export interface SyncJobStatus {
	id: string;
	tableId: string | number;
	status: 'pending' | 'running' | 'completed' | 'failed';
	progress: number;
	startTime: string;
	endTime?: string;
	errorMessage?: string;
}

export interface SyncMetrics {
	totalRows: number;
	processedRows: number;
	errorRows: number;
	duration: number;
}

export interface SyncResult {
	success: boolean;
	recordCount: number;
	errors: string[];
	timestamp: string;
}
