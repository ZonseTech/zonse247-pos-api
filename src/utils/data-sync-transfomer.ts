import dayjs from "dayjs";

export const transformValue = (column: string, value: any) => {
    const dbColumn = (column || '').replace(/([A-Z])/g, '_$1').toLowerCase()
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const dateTimeColumns = [
        'last_login',
        'last_logout',
        'created_at',
        'updated_at',
        'trial_ends_at',
        'activated_at',
        'last_sync',
        'last_activity',
        'registered_at',
        'updated_at',
        'starts_at',
        'ends_at',
        'last_payment_date',
        'expiration_date',
        'manufacture_date',
        'promo_start',
        'promo_end',
        'next_payment_date',
        'password_changed_at',
        'date'
    ];

    if (dateTimeColumns.includes(dbColumn)) {
        if (typeof value === 'string' && value.trim() !== '') {
            try {
                const date = dayjs(value);
                if (!date.isValid()) {
                    return null;
                }
                return date.format('YYYY-MM-DD HH:mm:ss');
            } catch (error) {
                console.warn(`Failed to parse date for column ${dbColumn}:`, value);
                return null;
            }
        }

        return null;
    }

    const booleanColumns = ['can_override_prices', 'force_password_change'];
    if (booleanColumns.includes(dbColumn)) {
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true' ? 1 : 0;
        }
        return value ? 1 : 0;
    }

    const numericColumns = ['max_discount_percent'];
    if (numericColumns.includes(dbColumn)) {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 0 : numValue;
    }

    const jsonColumns = ['accessible_shops', 'allowed_workstations'];
    if (jsonColumns.includes(dbColumn)) {
        if (typeof value === 'string') {
            try {
                JSON.parse(value);
                return value;
            } catch (error) {
                return JSON.stringify([value]);
            }
        }
        return JSON.stringify(value);
    }

    return value;
}