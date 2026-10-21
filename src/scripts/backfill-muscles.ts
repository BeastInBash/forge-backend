/**
 * Fills in the target muscles of the catalog exercises from the table below, matched on
 * name_key. Exercises that already have muscles are left alone unless `--force` is passed, so an
 * admin's edits in the app survive a re-run.
 *
 *   bun run db:backfill:muscles            write to the database
 *   bun run db:backfill:muscles --dry-run  list what would change, touch nothing
 *   bun run db:backfill:muscles --force    also overwrite exercises that have muscles
 */
import prisma from '../lib/db';
import { normalizeName } from '../common/utils/normalizeName';
import { MUSCLES, type Muscle } from '../common/utils/muscles';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

type Targets = { primary: Muscle[]; secondary: Muscle[] };
const t = (primary: Muscle[], secondary: Muscle[] = []): Targets => ({ primary, secondary });

/** Keyed by exercise name as stored (spelling included); matched case-insensitively. */
const TARGETS: Record<string, Targets> = {
    'Barbell Bench Press': t(['Mid chest'], ['Front delts', 'Triceps']),
    'Barbell Bentover Row': t(['Lats', 'Upper back'], ['Rear delts', 'Biceps', 'Lower back']),
    'Barbell Squat': t(['Quads', 'Glutes'], ['Adductors', 'Lower back']),
    'Cabel Lateral Raises': t(['Side delts'], ['Traps']),
    'Cabel Row': t(['Upper back', 'Lats'], ['Rear delts', 'Biceps']),
    'Close grip Bench Press': t(['Triceps'], ['Mid chest', 'Front delts']),
    'Close Grip Lat Pulldown': t(['Lats'], ['Biceps', 'Upper back']),
    Deadlift: t(['Hamstrings', 'Glutes', 'Lower back'], ['Traps', 'Quads', 'Forearms']),
    'Dumbell Lateral Raises': t(['Side delts'], ['Traps']),
    'Ez Barbell Curl': t(['Biceps'], ['Forearms']),
    'Flat Dumbbell Press': t(['Mid chest'], ['Front delts', 'Triceps']),
    'Hammer Curl': t(['Biceps', 'Forearms']),
    'Hamstring Curl': t(['Hamstrings'], ['Calves']),
    'High-to-Low Cable Fly': t(['Lower chest'], ['Front delts']),
    'Hip Thrust': t(['Glutes'], ['Hamstrings']),
    'Incline Barbell Bench Press': t(['Upper chest'], ['Front delts', 'Triceps']),
    'Incline Dumbbell Press': t(['Upper chest'], ['Front delts', 'Triceps']),
    'Lat Pulldown': t(['Lats'], ['Biceps', 'Rear delts']),
    'Leg Extension': t(['Quads']),
    'Leg Press': t(['Quads', 'Glutes'], ['Hamstrings', 'Adductors']),
    'Low-to-High Cable Fly': t(['Upper chest'], ['Front delts']),
    'Overhead Triceps Extension': t(['Triceps']),
    'Pec Deck Fly': t(['Mid chest'], ['Front delts']),
    'Preacher Curl': t(['Biceps'], ['Forearms']),
    'Pull Ups': t(['Lats'], ['Biceps', 'Upper back']),
    'Push Ups': t(['Mid chest'], ['Front delts', 'Triceps', 'Abs']),
    'Rear Delt Machine Fly': t(['Rear delts'], ['Upper back']),
    'Reverse Barbell Curl': t(['Forearms'], ['Biceps']),
    'Shoulder Press': t(['Front delts'], ['Side delts', 'Triceps']),
    Shrugs: t(['Traps']),
    'Stiff Leg Deadlift': t(['Hamstrings'], ['Glutes', 'Lower back']),
    'Triceps Push Down': t(['Triceps'])
};

/** Catches typos in the table and a muscle listed as both primary and secondary. */
const checkTable = () => {
    const problems: string[] = [];
    for (const [name, { primary, secondary }] of Object.entries(TARGETS)) {
        for (const muscle of [...primary, ...secondary]) {
            if (!MUSCLES.includes(muscle)) problems.push(`${name}: unknown muscle "${muscle}"`);
        }
        const both = primary.filter((muscle) => secondary.includes(muscle));
        if (both.length > 0) problems.push(`${name}: both primary and secondary: ${both}`);
    }
    return problems;
};

const main = async () => {
    const problems = checkTable();
    if (problems.length > 0) {
        for (const problem of problems) console.error(`✗ ${problem}`);
        process.exitCode = 1;
        return;
    }

    const byKey = new Map(
        Object.entries(TARGETS).map(([name, targets]) => [normalizeName(name), targets])
    );
    const exercises = await prisma.exercise.findMany({
        select: { id: true, exercise_name: true, name_key: true, primary_muscles: true },
        orderBy: { name_key: 'asc' }
    });

    console.log(`${dryRun ? '[dry run] ' : ''}${exercises.length} exercises in the catalog\n`);
    let updated = 0;
    const unmatched: string[] = [];

    for (const exercise of exercises) {
        const targets = byKey.get(exercise.name_key);
        if (!targets) {
            unmatched.push(exercise.exercise_name);
            continue;
        }
        if (exercise.primary_muscles.length > 0 && !force) {
            console.log(`· skip "${exercise.exercise_name}" (already has muscles)`);
            continue;
        }
        const summary = `${targets.primary.join(', ')}${targets.secondary.length ? ` + ${targets.secondary.join(', ')}` : ''}`;
        if (!dryRun) {
            await prisma.exercise.update({
                where: { id: exercise.id },
                data: { primary_muscles: targets.primary, secondary_muscles: targets.secondary }
            });
        }
        updated += 1;
        console.log(`${dryRun ? 'would set' : '✓ set'} "${exercise.exercise_name}": ${summary}`);
    }

    console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${updated} exercises.`);
    if (unmatched.length > 0) {
        console.log(`No muscles in the table for: ${unmatched.join(', ')}`);
    }
};

try {
    await main();
} finally {
    await prisma.$disconnect();
}
