describe('Application Tests', () => {
    test('Basic math test', () => {
        expect(1 + 1).toBe(2);
    });

    test('Environment test', () => {
        expect(process.env.NODE_ENV).toBeDefined();
    });
});