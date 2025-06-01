interface User {
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

type TAuthTokenProps = {
	user: User;
};

interface Till {
	id: number;
	uuid: string;
	name: string;
}

type AuthUser = {
	user: User;
	token: string;
};

type AuthProps = { username: string; password: string };

interface LoginResponse {
	token: string;
	message?: string;
	user: User;
}

interface UserInput extends Omit<User, 'uuid'> {
	uuid: string;
	pass?: string;
	[key: string]: unknown;
}

type Mode = 'dark' | 'light' | string;

interface TextInputProps {
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

interface Category {
	uuid: string;
	name: string;
	createdAt?: string;
	updateAt?: string;
	synced?: 1 | 0;
}

type DataTypes = string | number | undefined | null | boolean;

interface HoldOrder {
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

interface Product {
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

interface CartItem {
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

interface Setting {
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

interface Settings {
	synced?: 1 | 0;
	uuid: string;
	settings: Setting;
}

interface SettingsRequestBody {
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

interface Customer {
	uuid: string;
	name: string;
	phone?: string;
	email?: string;
	address?: string;
	synced?: 0 | 1;
}

interface AppSettings {
	theme: 'light' | 'dark';
	apiUrl: string;
	features: {
		enableFeatureA: boolean;
		enableFeatureB: boolean;
	};
	version: string;
}

type Transaction = {
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

type OrderItem = {
	synced?: 1 | 0;
	uuid: string;
	productId: string;
	transactionId: string;
	quantity: number;
	purchasePrice: number;
	sellPrice: number;
	createdAt?: string;
};

type ServiceProvider = {
	name: string;
	uuid: string;
};

type TransactionValues = {
	paymentMethodId?: string;
	serviceProviderId?: number;
	transactionId?: string;
	phoneNumber?: string;
	amountPaid: string | number;
};

type PaymentMethod = {
	uuid: string;
	name: string;
	icon?: string;
};

interface Printer {
	name: string;
	status: string;
	isDefault: boolean;
	location?: string;
	model?: string;
}

type CartTableFooterProps = {
	cart: Record[];
	discount: number;
	setDiscount: (value: number) => void;
	clearCart: () => void;
	subtotal: number;
	tax: number;
	total: number;
};

type MonthlySales = {
	date: number;
	totalAmount: number;
};

type TopProduct = {
	uuid: string;
	name: string;
	quantity: number;
	summedSellPrice: number;
	categoryName: string;
};

type DashboardCounts = {
	totalSales: string;
	stock: number;
	totalUsers: number;
	allCustomers: number;
	expiredProducts: number;
	myTotalTransactions: number;
};
