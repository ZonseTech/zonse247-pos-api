import { ESC_POS } from '../constants';

/**
 * A full-width divider line, e.g. divider('=', 48) => "================...\n"
 */
export function divider(char: string, width: number): string {
    return char.repeat(width) + '\n';
}

/**
 * Center text within a given width. Truncates if the text is already wider.
 */
export function centerText(text: string, width: number): string {
    if (text.length >= width) return text.substring(0, width);
    const totalPadding = width - text.length;
    const leftPadding = Math.floor(totalPadding / 2);
    return ' '.repeat(leftPadding) + text;
}

/**
 * Right-align text within a given width. Truncates if the text is already wider.
 */
export function rightAlignText(text: string, width: number): string {
    if (text.length >= width) return text.substring(0, width);
    return ' '.repeat(width - text.length) + text;
}

/**
 * Pad `left` and `right` to opposite edges of a fixed-width line, e.g.
 * formatLeftRight('Subtotal:', 'MK1,000.00', 32) => "Subtotal:      MK1,000.00"
 * No trailing newline — callers append one where they want it.
 *
 * @param truncateLeft - if true, truncates `left` to make room for `right`
 *   when the combined length would overflow `width` (used by receipts,
 *   where item names can be arbitrarily long; test/report pages assume
 *   short, known-fit labels and leave this off).
 */
export function formatLeftRight(left: string, right: string, width: number, truncateLeft = false): string {
    const effectiveLeft = truncateLeft && left.length > width - right.length - 1
        ? left.substring(0, width - right.length - 1)
        : left;
    const spaces = width - effectiveLeft.length - right.length;
    return effectiveLeft + ' '.repeat(Math.max(1, spaces)) + right;
}

/**
 * The feed-lines-then-cut footer nearly every content generator ends with.
 */
export function feedAndCut(feedLines: number, cutPaper = true): string {
    let out = ESC_POS.FEED_LINES(feedLines);
    if (cutPaper) {
        out += ESC_POS.CUT_PAPER;
    }
    return out;
}
