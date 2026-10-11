/**
 * Public pages Google Play links to: the privacy policy and how to delete an account. They are
 * plain HTML with inline styles so they need no build step or static hosting. Keep them in step
 * with what the app actually collects; the Play Console Data safety form must match.
 */

const CONTACT_EMAIL = 'saifdev0847@gmail.com';
const DEVELOPER = 'Mohammad Saif';
const UPDATED = '11 October 2026';

const layout = (title: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Forge Fitness</title>
<style>
:root { color-scheme: light dark; --bg: #ECEEF1; --card: #fff; --text: #15181C; --muted: #5B636E; --line: #D5D9DF; --accent: #8A6D1F; }
@media (prefers-color-scheme: dark) { :root { --bg: #15181C; --card: #1E2227; --text: #ECEEF1; --muted: #9AA3AE; --line: #2E343B; --accent: #E2C26B; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
article { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 24px; }
h1 { font-size: 28px; line-height: 1.2; margin: 0 0 4px; }
h2 { font-size: 19px; margin: 28px 0 8px; }
p, li { color: var(--text); }
.meta { color: var(--muted); font-size: 14px; margin: 0 0 16px; }
a { color: var(--accent); }
ul, ol { padding-left: 22px; }
li { margin: 4px 0; }
nav { margin-top: 16px; font-size: 14px; color: var(--muted); }
</style>
</head>
<body><main><article>
${body}
</article>
<nav><a href="/privacy">Privacy policy</a> · <a href="/delete-account">Delete your account</a></nav>
</main></body>
</html>`;

const mail = (subject: string) =>
    `<a href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}">${CONTACT_EMAIL}</a>`;

export const privacyPolicyPage = layout(
    'Privacy policy',
    `<h1>Privacy policy</h1>
<p class="meta">Forge Fitness · Last updated ${UPDATED}</p>

<p>Forge Fitness ("Forge", "the app") is a workout and nutrition tracker made by ${DEVELOPER}
("I", "me"). This policy explains what the app collects, why, who it is shared with, and how you
can delete it. Questions: ${mail('Forge privacy question')}.</p>

<h2>What Forge collects</h2>
<ul>
<li><strong>Account details</strong>: your name and email address. If you sign up with email,
your password is stored only as a secure hash. If you sign in with Google, Forge receives your
name, email address and profile photo from Google.</li>
<li><strong>Body and goal details</strong> you choose to enter during onboarding: age, height,
weight and fitness goal. Every one of these is optional.</li>
<li><strong>Fitness activity</strong>: your workout plans and the sets, reps and weights you
log.</li>
<li><strong>Meals</strong>: the foods and amounts you type in, when you ate them, and the
nutrition estimates calculated for them.</li>
<li><strong>Sign-in sessions</strong>: for each device you are signed in on, the IP address,
device/browser description and sign-in time, so you can see your active sessions and so the
service can be kept secure.</li>
</ul>
<p>Forge does not collect your location, contacts, or advertising identifiers, does not use
analytics or advertising SDKs, and does not read your photos. (Photo access is only used by the
app's administrator to add pictures to the shared exercise catalog.)</p>

<h2>How it is used</h2>
<ul>
<li>To provide the app: keep you signed in, save and show your plans, lifts and meals, and
calculate your progress and nutrition.</li>
<li>To keep the service secure and fix problems.</li>
</ul>
<p>Your data is not sold, not used for advertising, and not used to build profiles about you.</p>

<h2>Who it is shared with</h2>
<p>Forge relies on these service providers to run. They process data only on Forge's behalf:</p>
<ul>
<li><strong>Vercel</strong> hosts the Forge server.</li>
<li><strong>Neon</strong> hosts the database where your account and activity are stored.</li>
<li><strong>Google (Gemini API)</strong>: when you log a meal, the food names and amounts you
typed are sent to Google's Gemini AI to estimate their nutrition. Nothing else about you, such as
your name or email, is sent with them.</li>
<li><strong>Google Sign-In</strong>, only if you choose to sign in with Google.</li>
<li><strong>Cloudinary</strong> stores and serves the images in the shared exercise catalog. It
does not receive your personal data.</li>
</ul>
<p>Data may also be disclosed if required by law.</p>

<h2>Security</h2>
<p>All data is sent over encrypted connections (HTTPS). On your phone, your sign-in token is
kept in the device's secure storage. Passwords are stored only as hashes.</p>

<h2>How long it is kept, and deleting it</h2>
<p>Your data is kept for as long as you have an account. You can delete your account at any time
in the app under <strong>Profile → Delete account</strong>. This immediately and permanently
deletes your account, sessions, profile details, workout plans, lift logs and meals. Exercises
you added to the shared catalog stay available to others but are no longer linked to you.
If you can't use the app, see <a href="/delete-account">how to request deletion</a>.</p>

<h2>Your rights</h2>
<p>You can see your details in the app's Profile tab, change your onboarding answers, and delete
your account. To ask for a copy of your data or anything else about it, email
${mail('Forge data request')}.</p>

<h2>Children</h2>
<p>Forge is not directed at children under 13, and does not knowingly collect their data. If
you believe a child has created an account, email ${mail('Forge child account')} and it will be
deleted.</p>

<h2>Changes</h2>
<p>If this policy changes, the new version will be posted on this page with a new "Last
updated" date.</p>`
);

export const deleteAccountPage = layout(
    'Delete your account',
    `<h1>Delete your Forge account</h1>
<p class="meta">Forge Fitness by ${DEVELOPER}</p>

<h2>In the app (fastest)</h2>
<ol>
<li>Open Forge and sign in.</li>
<li>Go to the <strong>Profile</strong> tab.</li>
<li>Scroll to the bottom and tap <strong>Delete account</strong>, then confirm.</li>
</ol>
<p>Your account is deleted immediately.</p>

<h2>Without the app</h2>
<p>Email ${mail('Delete my Forge account')} from the email address on your Forge account, with
the subject "Delete my Forge account". The account will be deleted within 7 days and you will get
a reply confirming it.</p>

<h2>What gets deleted</h2>
<ul>
<li>Your account: name, email, password hash and linked Google sign-in</li>
<li>Your profile details: age, height, weight and goal</li>
<li>All your sign-in sessions</li>
<li>All your workout plans, lift logs and meals</li>
</ul>
<p>Everything is deleted permanently; nothing is kept afterwards. Exercises you added to the
shared exercise catalog stay available to other users but are no longer linked to you.</p>
<p>See the <a href="/privacy">privacy policy</a> for more.</p>`
);
