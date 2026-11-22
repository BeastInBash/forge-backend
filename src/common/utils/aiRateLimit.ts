const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export type AiLimits = { perHour: number; perDay: number };

export type AiLimitDecision = { allowed: true } | { allowed: false; retryAfterSec: number };

/**
 * Whether one more AI call fits in both rolling windows, given when the user's earlier calls
 * were made. When it doesn't, `retryAfterSec` is how long until enough old calls age out.
 */
export const checkAiLimit = (calls: Date[], now: Date, limits: AiLimits): AiLimitDecision => {
    const sorted = calls.map((call) => call.getTime()).sort((a, b) => a - b);
    let retryAt = 0;
    for (const [windowMs, limit] of [
        [HOUR_MS, limits.perHour],
        [DAY_MS, limits.perDay]
    ] as const) {
        const inWindow = sorted.filter((time) => time > now.getTime() - windowMs);
        if (inWindow.length < limit) continue;
        // A slot frees up when the call `limit` places from the newest leaves the window
        const freesAt = inWindow[inWindow.length - limit]! + windowMs;
        retryAt = Math.max(retryAt, freesAt);
    }
    if (retryAt === 0) return { allowed: true };
    const retryAfterSec = Math.max(1, Math.ceil((retryAt - now.getTime()) / 1000));
    return { allowed: false, retryAfterSec };
};

/** "Try again in 12 minutes" style wait, rounded up so it never promises too early. */
export const formatWait = (seconds: number) => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    const hours = Math.ceil(minutes / 60);
    return hours === 1 ? '1 hour' : `${hours} hours`;
};
