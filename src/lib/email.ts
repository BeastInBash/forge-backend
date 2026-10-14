import { Resend } from 'resend';
import type { EmailContent } from '../common/utils/authEmails';
import { env } from './env';

/**
 * The one place the backend sends email, through Resend. Callers build the content (see
 * `src/common/utils/authEmails.ts`); this delivers it and throws if it can't.
 */

let client: Resend | undefined;

export async function sendEmail(to: string, content: EmailContent) {
    if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set, so no email was sent');
    client ??= new Resend(env.RESEND_API_KEY);
    const { error } = await client.emails.send({
        from: env.EMAIL_FROM,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text
    });
    if (error) throw new Error(`Resend failed (${error.name}): ${error.message}`);
}
