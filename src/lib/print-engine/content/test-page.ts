import { PrinterDescriptor, PrinterType } from '../types';
import { ESC_POS } from '../constants';
import { centerText, divider, feedAndCut, formatLeftRight, rightAlignText } from '../utils/text-layout';

/**
 * Generate test page content.
 * For laser/inkjet printers, generates plain text.
 * For thermal printers, generates ESC/POS commands.
 */
export function generateTestPageContent(printer: PrinterDescriptor): string {
    const usePlainText = printer.printerType === PrinterType.LASER || printer.printerType === PrinterType.INKJET;

    if (usePlainText) {
        return generatePlainTextTestPage(printer);
    }

    return generateEscPosTestPage(printer);
}

function generatePlainTextTestPage(printer: PrinterDescriptor): string {
    const lineWidth = 60;
    let content = '';

    content += '\n';
    content += divider('=', lineWidth);
    content += centerText('PRINTER TEST PAGE', lineWidth) + '\n';
    content += centerText('Zonse247 POS System', lineWidth) + '\n';
    content += '='.repeat(lineWidth) + '\n\n';

    content += 'PRINTER INFORMATION\n';
    content += divider('-', lineWidth);
    content += `Printer Name:   ${printer.printerName}\n`;
    content += `Printer Type:   ${printer.printerType}\n`;
    content += `Printer Model:  ${printer.printerModel || 'N/A'}\n`;
    content += `Connection:     ${printer.connectionType}\n`;
    content += `Test Date:      ${new Date().toLocaleString()}\n\n`;

    content += 'CHARACTER SET TEST\n';
    content += divider('-', lineWidth);
    content += 'Numbers:    0123456789\n';
    content += 'Uppercase:  ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
    content += 'Lowercase:  abcdefghijklmnopqrstuvwxyz\n';
    content += 'Symbols:    !@#$%^&*()_+-=[]{}|;:\'",.<>?/\\\n\n';

    content += 'ALIGNMENT TEST\n';
    content += divider('-', lineWidth);
    content += 'Left Aligned Text\n';
    content += centerText('Center Aligned Text', lineWidth) + '\n';
    content += rightAlignText('Right Aligned Text', lineWidth) + '\n\n';

    content += 'LINE TEST\n';
    content += divider('-', lineWidth);
    content += 'Single line: ' + '-'.repeat(lineWidth - 13) + '\n';
    content += 'Double line: ' + '='.repeat(lineWidth - 13) + '\n';
    content += 'Dotted line: ' + '.'.repeat(lineWidth - 13) + '\n\n';

    content += 'SAMPLE RECEIPT FORMAT\n';
    content += divider('-', lineWidth);
    content += formatLeftRight('Item 1', 'K 1,000.00', lineWidth) + '\n';
    content += formatLeftRight('Item 2 (x2)', 'K 2,500.00', lineWidth) + '\n';
    content += formatLeftRight('Item 3', 'K 750.00', lineWidth) + '\n';
    content += divider('-', lineWidth);
    content += formatLeftRight('SUBTOTAL', 'K 4,250.00', lineWidth) + '\n';
    content += formatLeftRight('TAX (16.5%)', 'K 701.25', lineWidth) + '\n';
    content += divider('=', lineWidth);
    content += formatLeftRight('TOTAL', 'K 4,951.25', lineWidth) + '\n';
    content += '='.repeat(lineWidth) + '\n\n';

    content += divider('=', lineWidth);
    content += centerText('TEST COMPLETE', lineWidth) + '\n';
    content += centerText('Printer is functioning correctly!', lineWidth) + '\n';
    content += '='.repeat(lineWidth) + '\n\n';

    return content;
}

function generateEscPosTestPage(printer: PrinterDescriptor): string {
    let content = '';
    const lineWidth = 48;

    content += ESC_POS.INIT;
    content += ESC_POS.ALIGN_CENTER;

    content += divider('=', lineWidth);
    content += ESC_POS.DOUBLE_SIZE;
    content += 'PRINTER TEST PAGE\n';
    content += ESC_POS.NORMAL;
    content += 'Zonse247 POS System\n';
    content += '='.repeat(lineWidth) + '\n\n';

    content += ESC_POS.ALIGN_LEFT;
    content += `Printer: ${printer.printerName}\n`;
    content += `Type: ${printer.printerType}\n`;
    content += `Connection: ${printer.connectionType}\n`;
    if (printer.printerModel) {
        content += `Model: ${printer.printerModel}\n`;
    }
    content += `Date: ${new Date().toLocaleString()}\n\n`;

    content += ESC_POS.ALIGN_CENTER;
    content += divider('-', lineWidth);
    content += 'TEXT FORMATTING TEST\n';
    content += divider('-', lineWidth);

    content += ESC_POS.ALIGN_LEFT;
    content += ESC_POS.NORMAL;
    content += 'Normal Text\n';
    content += ESC_POS.BOLD_ON;
    content += 'Bold Text\n';
    content += ESC_POS.BOLD_OFF;
    content += ESC_POS.DOUBLE_HEIGHT;
    content += 'Double Height\n';
    content += ESC_POS.NORMAL;

    content += '\n';
    content += ESC_POS.ALIGN_CENTER;
    content += divider('-', lineWidth);
    content += 'ALIGNMENT TEST\n';
    content += divider('-', lineWidth);

    content += ESC_POS.ALIGN_LEFT;
    content += 'Left Aligned\n';
    content += ESC_POS.ALIGN_CENTER;
    content += 'Center Aligned\n';
    content += ESC_POS.ALIGN_RIGHT;
    content += 'Right Aligned\n';
    content += ESC_POS.ALIGN_LEFT;

    content += '\n';
    content += ESC_POS.ALIGN_CENTER;
    content += divider('-', lineWidth);
    content += 'CHARACTER TEST\n';
    content += divider('-', lineWidth);
    content += ESC_POS.ALIGN_LEFT;
    content += '0123456789\n';
    content += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
    content += 'abcdefghijklmnopqrstuvwxyz\n';

    content += '\n';
    content += ESC_POS.ALIGN_CENTER;
    content += divider('-', lineWidth);
    content += 'SAMPLE RECEIPT\n';
    content += divider('-', lineWidth);
    content += ESC_POS.ALIGN_LEFT;

    const formatLine = (left: string, right: string) => formatLeftRight(left, right, lineWidth) + '\n';

    content += formatLine('Item 1', 'K 1,000.00');
    content += formatLine('Item 2 x2', 'K 2,500.00');
    content += formatLine('Item 3', 'K 750.00');
    content += divider('-', lineWidth);
    content += ESC_POS.BOLD_ON;
    content += formatLine('TOTAL', 'K 4,250.00');
    content += ESC_POS.BOLD_OFF;

    content += '\n';
    content += ESC_POS.ALIGN_CENTER;
    content += divider('=', lineWidth);
    content += ESC_POS.DOUBLE_HEIGHT;
    content += 'TEST COMPLETE\n';
    content += ESC_POS.NORMAL;
    content += divider('=', lineWidth);
    content += '\nPrinter is working correctly!\n';
    content += 'Thank you for using Zonse247 POS\n';

    content += feedAndCut(4);

    return content;
}
