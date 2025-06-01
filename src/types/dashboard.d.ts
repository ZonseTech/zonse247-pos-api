interface SalesData {
    name: string;
    sales: number;
    prescriptions: number;
}

interface CategoryData {
    name: string;
    value: number;
}

interface HourlyData {
    hour: string;
    sales: number;
    prescriptions: number;
}

interface ProductData {
    id: number;
    name: string;
    type: 'Prescription' | 'OTC' | 'Supplement';
    sales: number;
    revenue: number;
}

interface InsuranceData {
    name: string;
    value: number;
}

interface InventoryAlertData {
    id: number;
    name: string;
    current: number;
    threshold: number;
}

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    change: string;
    color: string;
}

interface ChartPanelProps {
    title: string;
    children: React.ReactNode;
}

interface TableHeader {
    name: string;
    align: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
    title: string;
    headers: TableHeader[];
    data: T[];
    renderRow: (item: T) => React.ReactNode;
    icon: React.ReactNode;
}

interface AlertPanelProps {
    title: string;
    children: React.ReactNode;
    icon: React.ReactNode;
}

interface ProgressBarProps {
    label: string;
    count: number;
    percentage: number;
    color: string;
}

interface ClaimData {
    label: string;
    count: number;
    percentage: number;
    color: string;
}
