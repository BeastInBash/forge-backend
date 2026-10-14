/**
 * Emails sent by the auth flow. Each builder returns the subject plus matching HTML and plain-text
 * bodies; `src/lib/email.ts` sends them. Styles are inline because most mail clients drop
 * `<style>` blocks, and the colours are the app's light palette (iron panel, straw code).
 */

export interface EmailContent {
    subject: string;
    html: string;
    text: string;
}

const IRON = '#111827';
const IRON_TEXT = '#F8FAFC';
const ACCENT = '#F2C14E';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const LINE = '#E2E8F0';
const PAGE = '#F7F8FA';
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** The shared frame: an iron header with the wordmark, then a white card with the content. */
const layout = (preheader: string, body: string) => `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${PAGE};font-family:${FONT};color:${TEXT};">
<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="background:${IRON};border-radius:8px 8px 0 0;border-top:4px solid ${ACCENT};padding:20px 24px;">
<span style="color:${IRON_TEXT};font-size:20px;font-weight:800;letter-spacing:2px;">FORGE</span>
</td></tr>
<tr><td style="background:#FFFFFF;border:1px solid ${LINE};border-top:0;border-radius:0 0 8px 8px;padding:28px 24px;font-size:15px;line-height:22px;">
${body}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const muted = (text: string) =>
    `<p style="margin:16px 0 0;color:${TEXT_SECONDARY};font-size:13px;line-height:20px;">${text}</p>`;

/** The one-time code for resetting a password, valid for `minutes`. */
export function passwordResetCodeEmail(otp: string, minutes: number): EmailContent {
    const validity = `${minutes} minute${minutes === 1 ? '' : 's'}`;
    return {
        subject: `${otp} is your Forge password reset code`,
        html: layout(
            `Your code is ${otp}. It expires in ${validity}.`,
            `<p style="margin:0 0 16px;font-size:18px;font-weight:700;">Reset your password</p>
<p style="margin:0 0 20px;">Enter this code in the Forge app to choose a new password.</p>
<div style="background:${PAGE};border:1px solid ${LINE};border-radius:6px;padding:16px;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;font-family:Menlo, Consolas, monospace;">${otp}</div>
${muted(`The code expires in ${validity}. If you didn’t ask to reset your password, you can ignore this email; your password stays the same.`)}`
        ),
        text: [
            'Reset your Forge password',
            '',
            `Your code: ${otp}`,
            '',
            `Enter it in the Forge app to choose a new password. It expires in ${validity}.`,
            'If you didn’t ask to reset your password, you can ignore this email.'
        ].join('\n')
    };
}

/**
 * Sent instead of a code when the account has no password (it signs in with Google), so the
 * person learns how to get in without the API revealing which emails have accounts.
 */
export function noPasswordEmail(): EmailContent {
    return {
        subject: 'Signing in to Forge',
        html: layout(
            'Your Forge account signs in with Google.',
            `<p style="margin:0 0 16px;font-size:18px;font-weight:700;">You sign in with Google</p>
<p style="margin:0;">Someone asked to reset the password for this email, but your Forge account doesn’t use a password. Open Forge and tap <strong>Continue with Google</strong> to sign in.</p>
${muted('If you didn’t ask for this, you can ignore this email.')}`
        ),
        text: [
            'You sign in with Google',
            '',
            'Someone asked to reset the password for this email, but your Forge account doesn’t use a password.',
            'Open Forge and tap "Continue with Google" to sign in.',
            '',
            'If you didn’t ask for this, you can ignore this email.'
        ].join('\n')
    };
}
