import { ESC_POS } from '../constants';
import { divider, feedAndCut } from '../utils/text-layout';

export interface PrintReportData {
    title: string;
    subtitle?: string;
    generatedAt: Date;
    generatedBy?: string;
    dateRange?: { from: Date; to: Date };
    headers: string[];
    rows: string[][];
    summary?: Record<string, string | number>;
    notes?: string;
}

export function generateReportContent(reportData: PrintReportData): string {
    let content = '';
    const lineWidth = 48;

    content += ESC_POS.INIT;

    content += ESC_POS.ALIGN_CENTER;
    content += divider('=', lineWidth);
    content += ESC_POS.DOUBLE_SIZE;
    content += `${reportData.title.toUpperCase()}\n`;
    content += ESC_POS.NORMAL;

    if (reportData.subtitle) {
        content += `${reportData.subtitle}\n`;
    }

    content += divider('=', lineWidth);

    content += ESC_POS.ALIGN_LEFT;
    content += `Generated: ${reportData.generatedAt.toLocaleString()}\n`;

    if (reportData.generatedBy) {
        content += `By: ${reportData.generatedBy}\n`;
    }

    if (reportData.dateRange) {
        content += `Period: ${reportData.dateRange.from.toLocaleDateString()} - ${reportData.dateRange.to.toLocaleDateString()}\n`;
    }

    content += '\n';

    content += divider('-', lineWidth);
    const colWidth = Math.floor(lineWidth / reportData.headers.length);
    content += reportData.headers.map((h) => h.substring(0, colWidth - 1).padEnd(colWidth)).join('') + '\n';
    content += divider('-', lineWidth);

    for (const row of reportData.rows) {
        content += row.map((cell) =>
            (cell || '').toString().substring(0, colWidth - 1).padEnd(colWidth)
        ).join('') + '\n';
    }

    if (reportData.summary && Object.keys(reportData.summary).length > 0) {
        content += '\n';
        content += divider('=', lineWidth);
        content += ESC_POS.BOLD_ON;
        content += 'SUMMARY\n';
        content += ESC_POS.BOLD_OFF;
        content += divider('-', lineWidth);

        for (const [key, value] of Object.entries(reportData.summary)) {
            const valueStr = typeof value === 'number' ? value.toFixed(2) : value.toString();
            content += `${key}: ${valueStr}\n`;
        }
    }

    if (reportData.notes) {
        content += '\n';
        content += divider('-', lineWidth);
        content += `Note: ${reportData.notes}\n`;
    }

    content += '\n';
    content += divider('=', lineWidth);
    content += ESC_POS.ALIGN_CENTER;
    content += '*** END OF REPORT ***\n';
    content += divider('=', lineWidth);

    content += feedAndCut(4);

    return content;
}
