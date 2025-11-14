interface Till {
	id: number;
	userId: string;
	name: string;
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

type DataTypes = string | number | undefined | null | boolean;

interface AppSettings {
	theme: 'light' | 'dark';
	apiUrl: string;
	features: {
		enableFeatureA: boolean;
		enableFeatureB: boolean;
	};
	version: string;
}

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
