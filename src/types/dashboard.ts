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

export interface TableHeader {
    name: string;
    align: 'left' | 'center' | 'right';
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
