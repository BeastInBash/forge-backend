/** Reminder sizes are rounded to this, so they read like a glass ("250 ml", not "237 ml"). */
const SIP_STEP_ML = 50;

/** "HH:mm" → minutes since midnight. */
export const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours! * 60 + minutes!;
};

/** An even share of `ml` over `count` reminders, rounded up to a whole sip. */
const sipMl = (ml: number, count: number) =>
    Math.max(SIP_STEP_ML, Math.ceil(ml / count / SIP_STEP_ML) * SIP_STEP_ML);

const toTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** True when `timezone` is an IANA zone this runtime knows, e.g. "Asia/Karachi". */
export const isValidTimezone = (timezone: string) => {
    try {
        return Boolean(new Intl.DateTimeFormat('en-US', { timeZone: timezone }).resolvedOptions());
    } catch {
        return false;
    }
};

/** Today's date in `timezone` as "YYYY-MM-DD". */
export const localDate = (timezone: string, at = new Date()) =>
    // en-CA formats dates as YYYY-MM-DD
    new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(at);

/** How far `timezone` is ahead of UTC at `at`, in ms. */
const offsetMs = (timezone: string, at: Date) => {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hourCycle: 'h23',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        })
            .formatToParts(at)
            .map((part) => [part.type, Number(part.value)])
    );
    const wallClock = Date.UTC(
        parts.year!,
        parts.month! - 1,
        parts.day!,
        parts.hour!,
        parts.minute!,
        parts.second!
    );
    return wallClock - Math.floor(at.getTime() / 1000) * 1000;
};

/** The instant local midnight of `date` ("YYYY-MM-DD") happens in `timezone`. */
const localMidnight = (date: string, timezone: string) => {
    const [year, month, day] = date.split('-').map(Number);
    const asUtc = Date.UTC(year!, month! - 1, day!);
    const guess = asUtc - offsetMs(timezone, new Date(asUtc));
    // Re-check at the guess, in case a DST change falls between UTC and local midnight
    return new Date(asUtc - offsetMs(timezone, new Date(guess)));
};

/** The UTC instants a local day spans: `from` inclusive, `to` exclusive. */
export const localDayRange = (date: string, timezone: string) => {
    const [year, month, day] = date.split('-').map(Number);
    const next = new Date(Date.UTC(year!, month! - 1, day! + 1)).toISOString().slice(0, 10);
    return { from: localMidnight(date, timezone), to: localMidnight(next, timezone) };
};

export interface ReminderSettings {
    dailyGoalMl: number;
    reminderStart: string;
    reminderEnd: string;
    reminderIntervalMin: number;
}

/**
 * The local times to remind the user at, from `reminderStart` every `reminderIntervalMin` up to
 * `reminderEnd`, and how much to drink at each so the goal is met by the last one.
 */
export const reminderSchedule = ({
    dailyGoalMl,
    reminderStart,
    reminderEnd,
    reminderIntervalMin
}: ReminderSettings) => {
    const times: string[] = [];
    for (
        let at = toMinutes(reminderStart);
        at <= toMinutes(reminderEnd);
        at += reminderIntervalMin
    ) {
        times.push(toTime(at));
    }
    return { times, perReminderMl: sipMl(dailyGoalMl, times.length) };
};

/** A reminder this long after its slot is skipped rather than sent late. */
const REMINDER_GRACE_MS = 30 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/**
 * Whether a reminder push is due at `now`: the latest slot that has passed is under 30 minutes
 * old and the last reminder went out before it. The scheduler may call at any cadence up to
 * every 30 minutes; each slot is sent at most once.
 *
 * Returns how many slots are left today, this one included, or null when nothing is due.
 */
export const dueReminder = (
    goal: ReminderSettings & { timezone: string; lastReminderAt: Date | null },
    now: Date
) => {
    const sinceMidnight =
        (((now.getTime() + offsetMs(goal.timezone, now)) % DAY_MS) + DAY_MS) % DAY_MS;
    const { times } = reminderSchedule(goal);
    const passed = times.filter((time) => toMinutes(time) * 60_000 <= sinceMidnight);
    const slot = passed.at(-1);
    if (!slot) return null;

    const sinceSlot = sinceMidnight - toMinutes(slot) * 60_000;
    if (sinceSlot > REMINDER_GRACE_MS) return null;
    const slotStartedAt = now.getTime() - sinceSlot;
    if (goal.lastReminderAt && goal.lastReminderAt.getTime() >= slotStartedAt) return null;
    return { slotsLeft: times.length - passed.length + 1 };
};

/** "750 ml" or "1.5 L". */
const formatVolume = (ml: number) =>
    ml < 1000 ? `${ml} ml` : `${Number((ml / 1000).toFixed(1))} L`;

/** The push for one reminder: what to drink now so the rest of the day's goal is spread out. */
export const waterReminderMessage = (goalMl: number, consumedMl: number, slotsLeft: number) => {
    const progress =
        consumedMl === 0
            ? "You haven't logged any water yet today."
            : `You've had ${formatVolume(consumedMl)} of ${formatVolume(goalMl)} today.`;
    return {
        title: 'Time to drink water 💧',
        body: `Have about ${formatVolume(sipMl(goalMl - consumedMl, slotsLeft))} now. ${progress}`
    };
};
