/**
 * ESC/POS command table shared by all content formatters.
 */
export const ESC_POS = {
    // Initialization
    INIT: '\x1B\x40',

    // Text alignment
    ALIGN_LEFT: '\x1B\x61\x00',
    ALIGN_CENTER: '\x1B\x61\x01',
    ALIGN_RIGHT: '\x1B\x61\x02',

    // Text formatting
    BOLD_ON: '\x1B\x45\x01',
    BOLD_OFF: '\x1B\x45\x00',
    UNDERLINE_ON: '\x1B\x2D\x01',
    UNDERLINE_OFF: '\x1B\x2D\x00',
    DOUBLE_HEIGHT: '\x1B\x21\x10',
    DOUBLE_WIDTH: '\x1B\x21\x20',
    DOUBLE_SIZE: '\x1B\x21\x30',
    NORMAL: '\x1B\x21\x00',

    // Line spacing
    LINE_SPACING_DEFAULT: '\x1B\x32',
    LINE_SPACING_SET: (n: number) => `\x1B\x33${String.fromCharCode(n)}`,

    // Paper handling
    CUT_PAPER: '\x1D\x56\x00',
    CUT_PAPER_PARTIAL: '\x1D\x56\x01',
    FEED_LINES: (n: number) => `\x1B\x64${String.fromCharCode(n)}`,

    // Cash drawer
    OPEN_DRAWER: '\x1B\x70\x00\x19\xFA',

    // Barcode
    BARCODE_HEIGHT: (n: number) => `\x1D\x68${String.fromCharCode(n)}`,
    BARCODE_WIDTH: (n: number) => `\x1D\x77${String.fromCharCode(n)}`,
    BARCODE_TEXT_BELOW: '\x1D\x48\x02',
    BARCODE_CODE128: (data: string) => `\x1D\x6B\x49${String.fromCharCode(data.length)}${data}`,
    BARCODE_EAN13: (data: string) => `\x1D\x6B\x02${data}\x00`,

    // QR Code
    QR_MODEL: '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00',
    QR_SIZE: (n: number) => `\x1D\x28\x6B\x03\x00\x31\x43${String.fromCharCode(n)}`,
    QR_ERROR: '\x1D\x28\x6B\x03\x00\x31\x45\x31',
    QR_STORE: (data: string) => {
        const len = data.length + 3;
        return `\x1D\x28\x6B${String.fromCharCode(len % 256)}${String.fromCharCode(Math.floor(len / 256))}\x31\x50\x30${data}`;
    },
    QR_PRINT: '\x1D\x28\x6B\x03\x00\x31\x51\x30',

    // Beep
    BEEP: '\x1B\x42\x03\x02',

    // Raster bit image (GS v 0)
    // m=0: normal, m=1: double width, m=2: double height, m=3: double width+height
    RASTER_IMAGE: (width: number, height: number, data: Uint8Array, mode = 0) => {
        const xL = (width / 8) % 256;
        const xH = Math.floor((width / 8) / 256);
        const yL = height % 256;
        const yH = Math.floor(height / 256);
        return `\x1D\x76\x30${String.fromCharCode(mode)}${String.fromCharCode(xL)}${String.fromCharCode(xH)}${String.fromCharCode(yL)}${String.fromCharCode(yH)}${String.fromCharCode(...data)}`;
    },
};

export const ZONSE247_LOGO = [
    '********************************',
    '*                              *',
    '*        ZONSE247 POS          *',
    '*                              *',
    '********************************',
].join('\n') + '\n';
