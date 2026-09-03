/**
 * Common USB Vendor IDs for printers — used to identify likely printers
 * among enumerated USB devices during discovery.
 */
export const PRINTER_VENDOR_IDS = [
    // Major Brands
    0x04b8, // Epson
    0x0519, // Star Micronics
    0x0dd4, // Custom Engineering
    0x1504, // Posiflex
    0x03f0, // HP
    0x04f9, // Brother
    0x04a9, // Canon
    0x04e8, // Samsung
    0x0482, // Kyocera
    0x04da, // Panasonic
    0x0924, // Xerox
    0x0b00, // Zebra Technologies
    0x0a5f, // Zebra (legacy)
    0x2730, // Citizen Systems
    0x2e6a, // TSC

    // POS/Thermal Receipt Printers (Chinese/Generic)
    0x0416, // Winbond (common in receipt printers)
    0x0fe6, // ICS Electronics (receipt printers)
    0x1a86, // QinHeng Electronics (CH340 - common in Chinese printers like POS-80C)
    0x0483, // STMicroelectronics
    0x20d1, // Simcom
    0x1fc9, // NXP
    0x0525, // Netchip (common in thermal printers)
    0x28e9, // GD32/Gigadevice (POS printers)
    0x1d90, // Generic POS printers
    0x6868, // Generic thermal printers
    0x0456, // Analog Devices (thermal printer controllers)
    0x154f, // SNBC (Sunphor receipt printers)
    0x0fe5, // XPrinter/Xprinter Technology
    0x2341, // Generic POS/Arduino-based
    0x1003, // Generic thermal (used by many Chinese brands)
    0x0aa7, // Costar/Thermal printers

    // USB-Serial Adapters (for serial printers)
    0x067b, // Prolific (USB-Serial)
    0x10c4, // Silicon Labs CP210x
    0x0403, // FTDI
    0x2109, // VIA Labs
];
