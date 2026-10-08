type LiftSet = { weight: number | null; reps: number };

/**
 * Estimated one-rep max (Epley). A single is its own max; bodyweight sets have no load to
 * estimate from and count as 0.
 */
export const estimateOneRepMax = ({ weight, reps }: LiftSet): number => {
    if (weight === null) return 0;
    return reps === 1 ? weight : weight * (1 + reps / 30);
};

/** The session's best set: heaviest estimated max, or most reps when every set is bodyweight. */
export const bestSet = <T extends LiftSet>(sets: T[]): T | undefined =>
    sets.reduce<T | undefined>((best, set) => {
        if (!best) return set;
        const delta = estimateOneRepMax(set) - estimateOneRepMax(best);
        return delta > 0 || (delta === 0 && set.reps > best.reps) ? set : best;
    }, undefined);
