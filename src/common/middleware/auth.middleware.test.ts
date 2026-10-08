import { describe, expect, test } from 'bun:test';
import { isAdmin } from './auth.middleware';

type Session = Parameters<typeof isAdmin>[0];
const sessionFor = (email: string) => ({ user: { email } }) as Session;

describe('isAdmin', () => {
    test('accepts the default admin email, ignoring case', () => {
        expect(isAdmin(sessionFor('mohammadsaif0847@gmail.com'))).toBe(true);
        expect(isAdmin(sessionFor('MohammadSaif0847@Gmail.com'))).toBe(true);
    });
    test('rejects everyone else', () => {
        expect(isAdmin(sessionFor('someone@example.com'))).toBe(false);
    });
});
