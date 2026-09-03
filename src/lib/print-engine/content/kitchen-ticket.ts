import { ESC_POS } from '../constants';
import { divider, feedAndCut } from '../utils/text-layout';

export interface KitchenOrderData {
    orderId: string;
    orderNumber?: string;
    items: Array<{ name: string; quantity: number; notes?: string; modifiers?: string[] }>;
    tableNumber?: string;
    serverName?: string;
    priority?: 'normal' | 'rush' | 'vip';
    orderType?: 'dine-in' | 'takeaway' | 'delivery';
    customerName?: string;
    specialInstructions?: string;
}

export function generateKitchenTicketContent(orderData: KitchenOrderData): string {
    let content = '';
    const lineWidth = 48;

    content += ESC_POS.INIT;

    if (orderData.priority === 'rush') {
        content += ESC_POS.ALIGN_CENTER;
        content += ESC_POS.DOUBLE_SIZE;
        content += ESC_POS.BOLD_ON;
        content += '*** RUSH ORDER ***\n';
        content += ESC_POS.BOLD_OFF;
        content += ESC_POS.NORMAL;
    } else if (orderData.priority === 'vip') {
        content += ESC_POS.ALIGN_CENTER;
        content += ESC_POS.DOUBLE_SIZE;
        content += ESC_POS.BOLD_ON;
        content += '*** VIP ORDER ***\n';
        content += ESC_POS.BOLD_OFF;
        content += ESC_POS.NORMAL;
    }

    content += ESC_POS.ALIGN_CENTER;
    content += divider('=', lineWidth);
    content += ESC_POS.DOUBLE_SIZE;
    content += 'KITCHEN ORDER\n';
    content += ESC_POS.NORMAL;
    content += '='.repeat(lineWidth) + '\n\n';

    content += ESC_POS.ALIGN_LEFT;
    content += ESC_POS.DOUBLE_HEIGHT;
    content += `Order #: ${orderData.orderNumber || orderData.orderId}\n`;
    content += ESC_POS.NORMAL;
    content += `Time: ${new Date().toLocaleTimeString()}\n`;

    if (orderData.orderType) {
        content += ESC_POS.BOLD_ON;
        content += `Type: ${orderData.orderType.toUpperCase()}\n`;
        content += ESC_POS.BOLD_OFF;
    }

    if (orderData.tableNumber) {
        content += ESC_POS.DOUBLE_HEIGHT;
        content += `Table: ${orderData.tableNumber}\n`;
        content += ESC_POS.NORMAL;
    }

    if (orderData.serverName) {
        content += `Server: ${orderData.serverName}\n`;
    }

    if (orderData.customerName) {
        content += `Customer: ${orderData.customerName}\n`;
    }

    content += '\n';
    content += divider('-', lineWidth);
    content += ESC_POS.BOLD_ON;
    content += 'ITEMS\n';
    content += ESC_POS.BOLD_OFF;
    content += divider('-', lineWidth);

    for (const item of orderData.items) {
        content += ESC_POS.DOUBLE_HEIGHT;
        content += ESC_POS.BOLD_ON;
        content += `${item.quantity}x ${item.name}\n`;
        content += ESC_POS.BOLD_OFF;
        content += ESC_POS.NORMAL;

        if (item.modifiers && item.modifiers.length > 0) {
            for (const mod of item.modifiers) {
                content += `   + ${mod}\n`;
            }
        }

        if (item.notes) {
            content += ESC_POS.BOLD_ON;
            content += `   >> ${item.notes}\n`;
            content += ESC_POS.BOLD_OFF;
        }

        content += '\n';
    }

    if (orderData.specialInstructions) {
        content += divider('-', lineWidth);
        content += ESC_POS.BOLD_ON;
        content += 'SPECIAL INSTRUCTIONS:\n';
        content += ESC_POS.BOLD_OFF;
        content += `${orderData.specialInstructions}\n`;
    }

    content += divider('-', lineWidth);
    content += `Printed: ${new Date().toLocaleString()}\n`;

    content += feedAndCut(3);

    return content;
}
