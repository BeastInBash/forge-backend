/**
 * Request payload shapes for creating a workout plan.
 *
 * These describe what arrives over HTTP — NOT what Prisma stores. Anything that
 * needs a real `Date`, a generated id, or a normalized `name_key` is produced by
 * the service, not sent by the client.
 */

/** How an exercise is performed inside one specific plan (the join-row values). */
interface IWorkoutExerciseFields {
    repetition: number;
    sets: number;
}

/** Picked from the dropdown — the exercise already exists in the catalog. */
export interface IExistingExercise extends IWorkoutExerciseFields {
    exerciseId: string;
}

/**
 * Typed in by the user — not in the catalog yet, so the service must find-or-create
 * it (upsert on the normalized `name_key`) before writing the join row.
 * `name_key` is derived server-side; never accept it from the client.
 */
export interface INewExercise extends IWorkoutExerciseFields {
    exercise_name: string;
    exercise_video?: string;
    exercise_icon?: string;
}

/**
 * One entry in the plan: either a catalog pick or a brand-new exercise.
 * Narrow it with the `in` operator:
 *
 *   if ("exerciseId" in item) { // IExistingExercise
 *   } else {                    // INewExercise
 *   }
 */
export type IExercise = IExistingExercise | INewExercise;

/** The JSON body the client POSTs. */
export interface IWorkoutBody {
    day: string;
    /** ISO 8601 string — JSON has no Date. The service parses it before Prisma. */
    time: string;
    muscle_group: string;
    exercises: IExercise[];
}

/**
 * What the service receives: the body plus the userId the controller injects
 * from the session. `userId` is deliberately not part of IWorkoutBody so a
 * client can never supply it.
 */
export interface IWorkout extends IWorkoutBody {
    userId: string;
}
