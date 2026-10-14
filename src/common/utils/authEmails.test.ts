import { describe, expect, test } from 'bun:test';
import { noPasswordEmail, passwordResetCodeEmail } from './authEmails';

describe('passwordResetCodeEmail', () => {
    test('puts the code in the subject and both bodies', () => {
        const email = passwordResetCodeEmail('482913', 10);
        expect(email.subject).toContain('482913');
        expect(email.html).toContain('482913');
        expect(email.text).toContain('482913');
    });

    test('states how long the code is valid', () => {
        expect(passwordResetCodeEmail('000000', 10).text).toContain('10 minutes');
        expect(passwordResetCodeEmail('000000', 1).text).toContain('1 minute.');
    });
});

describe('noPasswordEmail', () => {
    test('points to Google sign-in and carries no code', () => {
        const email = noPasswordEmail();
        expect(email.text).toContain('Continue with Google');
        expect(email.text).not.toMatch(/\d{6}/);
    });
});
