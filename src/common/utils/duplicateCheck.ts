import { normalizeName } from './normalizeName';
import type { IExercise } from '../types/IWorkout';

export const duplicateCheck = (exercises: IExercise[]) => {
    const duplicateName: string[] = [];
    const seenExercise = new Set<string>();
    const seenExerciseIds = new Set<string>();

    for (const exercise of exercises) {
        if ('exerciseId' in exercise) {
            // Checking if exercises has exerciseId or not

            // if true
            if (seenExerciseIds.has(exercise.exerciseId)) {
                // check if seenExerciseIds set has exerciseId
                // if true then push the id to duplicateName
                duplicateName.push(exercise.exerciseId);
            } else {
                // Else add the id to seenExerciseIds
                seenExerciseIds.add(exercise.exerciseId);
            }
        } else {
            const normalizedName = normalizeName(exercise.exercise_name);
            if (seenExercise.has(normalizedName)) {
                duplicateName.push(normalizedName);
            } else {
                seenExercise.add(normalizedName);
            }
        }
    }
    return {
        hasDuplicate: duplicateName.length > 0,
        duplicates: duplicateName
    };
};
