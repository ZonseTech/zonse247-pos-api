/**
 * Report utility functions for data aggregation and formatting
 */
import { SalesDataPoint, TotalSalesReport, ReportFilters, SaleDataItem } from '../types/report';
import { DAYS_OF_WEEK, MONTHS_OF_YEAR } from '../constants/report.constants';

/**
 * Build base where clause with tenant and optional branch filter
 */
export function buildBaseWhereClause(filters: ReportFilters): any {
    const whereClause: any = { tenantId: filters.tenantId };
    if (filters.branchId) {
        whereClause.branchId = filters.branchId;
    }
    return whereClause;
}

/**
 * Add date range filter to where clause
 */
export function addDateFilter(whereClause: any, startDate?: string, endDate?: string): any {
    if (!startDate && !endDate) return whereClause;

    const filtered = { ...whereClause };
    filtered.createdAt = {};

    if (startDate) {
        filtered.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filtered.createdAt.lte = endDateTime;
    }

    return filtered;
}

/**
 * Build complete sales where clause with status filter
 */
export function buildSalesWhereClause(filters: ReportFilters, status = 'COMPLETED'): any {
    const baseClause = buildBaseWhereClause(filters);
    const withDate = addDateFilter(baseClause, filters.startDate, filters.endDate);
    return { ...withDate, status };
}

/**
 * Build a where-clause for approved expenses within an optional date range,
 * scoped by tenant/branch. Bucketed by the expense's business `expenseDate`
 * rather than `createdAt` (unlike addDateFilter, which is shared with Sale
 * queries elsewhere and hardcoded to `createdAt`).
 */
export function buildExpenseWhereClause(filters: ReportFilters): any {
    const where: any = { tenantId: filters.tenantId, status: 'APPROVED', deletedAt: null };
    if (filters.branchId) {
        where.branchId = filters.branchId;
    }

    if (filters.startDate || filters.endDate) {
        where.expenseDate = {};
        if (filters.startDate) {
            where.expenseDate.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            where.expenseDate.lte = end;
        }
    }

    return where;
}

/**
 * Format hour to 12-hour format with minutes (e.g., 12:00AM, 1:00PM)
 */
export function formatHour(hour: number): string {
    if (hour === 0) return '12:00AM';
    if (hour === 12) return '12:00PM';
    if (hour > 12) return `${hour - 12}:00PM`;
    return `${hour}:00AM`;
}

/**
 * Get day index (Monday = 0, Sunday = 6)
 */
export function getDayIndex(date: Date): number {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

/**
 * Calculate hourly distribution for any value
 */
export function calculateHourlyDistribution(items: SaleDataItem[]): SalesDataPoint[] {
    const hourlyMap: Record<number, number> = {};

    // Initialize all 24 hours
    for (let hour = 0; hour < 24; hour++) {
        hourlyMap[hour] = 0;
    }

    // Aggregate by hour
    for (const item of items) {
        const date = new Date(item.saleDate || item.createdAt);
        const hour = date.getHours();
        hourlyMap[hour] += item.value;
    }

    // Convert to data points with range labels
    const hourlyData: SalesDataPoint[] = [];
    for (let hour = 0; hour < 24; hour++) {
        const startLabel = formatHour(hour);
        const endLabel = formatHour((hour + 1) % 24);
        hourlyData.push({
            label: `${startLabel} - ${endLabel}`,
            value: Math.round(hourlyMap[hour] * 100) / 100,
        });
    }

    return hourlyData;
}

/**
 * Calculate weekly distribution for any value
 */
export function calculateWeeklyDistribution(items: SaleDataItem[]): SalesDataPoint[] {
    const weeklyMap: Record<string, number> = {};

    // Initialize all days
    for (const day of DAYS_OF_WEEK) {
        weeklyMap[day] = 0;
    }

    // Aggregate by day of week
    for (const item of items) {
        const date = new Date(item.saleDate || item.createdAt);
        const dayIndex = getDayIndex(date);
        weeklyMap[DAYS_OF_WEEK[dayIndex]] += item.value;
    }

    // Convert to data points
    return DAYS_OF_WEEK.map(day => ({
        label: day,
        value: Math.round(weeklyMap[day] * 100) / 100,
    }));
}

/**
 * Calculate monthly distribution for any value
 */
export function calculateMonthlyDistribution(items: SaleDataItem[]): SalesDataPoint[] {
    const monthlyMap: Record<string, number> = {};

    // Initialize all months
    for (const month of MONTHS_OF_YEAR) {
        monthlyMap[month] = 0;
    }

    // Aggregate by month
    for (const item of items) {
        const date = new Date(item.saleDate || item.createdAt);
        const monthName = MONTHS_OF_YEAR[date.getMonth()];
        monthlyMap[monthName] += item.value;
    }

    // Convert to data points
    return MONTHS_OF_YEAR.map(month => ({
        label: month,
        value: Math.round(monthlyMap[month] * 100) / 100,
    }));
}

/**
 * Build time-based report from data items
 */
export function buildTimeBasedReport(items: SaleDataItem[]): TotalSalesReport {
    const hourlyData = calculateHourlyDistribution(items);
    const weeklyData = calculateWeeklyDistribution(items);
    const monthlyData = calculateMonthlyDistribution(items);

    return {
        hourly: { data: hourlyData.filter(item => item.value > 0) },
        weekly: { data: weeklyData.filter(item => item.value > 0) },
        monthly: { data: monthlyData.filter(item => item.value > 0) },
    };
}
