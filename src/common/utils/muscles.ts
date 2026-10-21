/**
 * The muscles an exercise can target, grouped by body region. Exercises store these labels as
 * they are, so the app can show them without a lookup; renaming one means migrating the rows.
 */
export const MUSCLE_GROUPS = {
    Chest: ['Upper chest', 'Mid chest', 'Lower chest'],
    Shoulders: ['Front delts', 'Side delts', 'Rear delts'],
    Arms: ['Biceps', 'Triceps', 'Forearms'],
    Back: ['Lats', 'Upper back', 'Traps', 'Lower back'],
    Core: ['Abs', 'Obliques'],
    Legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors']
} as const;

export const MUSCLES = Object.values(MUSCLE_GROUPS).flat() as [Muscle, ...Muscle[]];

export type Muscle = (typeof MUSCLE_GROUPS)[keyof typeof MUSCLE_GROUPS][number];
