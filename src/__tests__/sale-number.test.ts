/**
 * Sale numbers: SALE-YYYYMMDD-NNNNN, plus the "-<terminal code>" suffix the
 * server adds when a synced sale's number was already used in the branch.
 * The next number of the day is built from the highest existing one, so the
 * sequence must be read correctly from suffixed numbers too.
 */
import { extractSequenceNumber, formatSaleNumber } from '../utils/sale.utils';

describe('sale numbers', () => {
    it('reads the sequence of a plain sale number', () => {
        expect(extractSequenceNumber('SALE-20261117-00012')).toBe(12);
    });

    it('reads the sequence of a number renumbered on sync, not the terminal code', () => {
        expect(extractSequenceNumber('SALE-20261117-00001-TR004')).toBe(1);
        expect(extractSequenceNumber('SALE-20261117-00001-TR004-2')).toBe(1);
        expect(extractSequenceNumber('SALE-20260819-00003-B')).toBe(3);
    });

    it('gives the next number after a renumbered sale instead of NaN', () => {
        const highestToday = 'SALE-20261117-00001-TR004';
        expect(formatSaleNumber('SALE-20261117', extractSequenceNumber(highestToday) + 1)).toBe('SALE-20261117-00002');
    });

    it('returns 0 for a number without a date and sequence', () => {
        expect(extractSequenceNumber('OFFLINE-ABC123-1763371200000')).toBe(0);
        expect(extractSequenceNumber('')).toBe(0);
    });
});
