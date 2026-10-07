/**
 * Uploads every image in `workout_images/` to Cloudinary and upserts the matching catalog
 * exercise. The file name is the exercise name: `Barbell Back Squat.png` becomes the exercise
 * "Barbell Back Squat" with that image.
 *
 *   bun run db:seed:exercises            upload and write to the database
 *   bun run db:seed:exercises --dry-run  list what would happen, touch nothing
 *
 * Safe to re-run: images are replaced in place (the public id comes from the name) and
 * exercises are matched on name_key, so new files are added and changed ones updated.
 */
import { readdir } from 'node:fs/promises';
import { extname, join, parse } from 'node:path';
import prisma from '../lib/db';
import { isCloudinaryConfigured, toPublicId, uploadExerciseImage } from '../lib/cloudinary';
import { normalizeName } from '../common/utils/normalizeName';

const IMAGE_DIR = join(import.meta.dir, '../../workout_images');
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const dryRun = process.argv.includes('--dry-run');

type Entry = { file: string; name: string; nameKey: string };

const readEntries = async (): Promise<Entry[]> => {
    const files = (await readdir(IMAGE_DIR)).filter((file) =>
        IMAGE_EXTENSIONS.has(extname(file).toLowerCase())
    );
    return files.toSorted().map((file) => {
        const name = parse(file).name.trim().replace(/\s+/g, ' ');
        return { file, name, nameKey: normalizeName(name) };
    });
};

/** Two files that differ only by case or extension would overwrite each other. */
const findClashes = (entries: Entry[]) => {
    const byKey = Map.groupBy(entries, (entry) => entry.nameKey);
    return [...byKey.values()].filter((group) => group.length > 1);
};

const main = async () => {
    const entries = await readEntries();
    if (entries.length === 0) {
        console.log(`No images found in ${IMAGE_DIR}`);
        return;
    }

    const clashes = findClashes(entries);
    if (clashes.length > 0) {
        for (const group of clashes) {
            console.error(`✗ Same exercise name: ${group.map((entry) => entry.file).join(', ')}`);
        }
        process.exitCode = 1;
        return;
    }
    if (!dryRun && !isCloudinaryConfigured) {
        console.error(
            '✗ CLOUDINARY_URL is not set in .env (cloudinary://<api_key>:<api_secret>@<cloud_name>)'
        );
        process.exitCode = 1;
        return;
    }

    const existing = new Set(
        (
            await prisma.exercise.findMany({
                where: { name_key: { in: entries.map((entry) => entry.nameKey) } },
                select: { name_key: true }
            })
        ).map((exercise) => exercise.name_key)
    );

    console.log(`${dryRun ? '[dry run] ' : ''}${entries.length} images in ${IMAGE_DIR}\n`);
    const failures: string[] = [];

    if (dryRun) {
        for (const [index, entry] of entries.entries()) {
            const action = existing.has(entry.nameKey) ? 'update' : 'create';
            console.log(
                `[${index + 1}/${entries.length}] would ${action} "${entry.name}" ← ${entry.file} (image id ${toPublicId(entry.nameKey)})`
            );
        }
        return;
    }

    for (const [index, entry] of entries.entries()) {
        const action = existing.has(entry.nameKey) ? 'update' : 'create';
        const prefix = `[${index + 1}/${entries.length}]`;
        try {
            const file = Bun.file(join(IMAGE_DIR, entry.file));
            const imageUrl = await uploadExerciseImage(
                { buffer: await file.bytes(), mimetype: file.type },
                entry.nameKey
            );
            await prisma.exercise.upsert({
                where: { name_key: entry.nameKey },
                create: {
                    exercise_name: entry.name,
                    name_key: entry.nameKey,
                    exercise_icon: imageUrl
                },
                update: { exercise_name: entry.name, exercise_icon: imageUrl }
            });
            console.log(`${prefix} ✓ ${action}d "${entry.name}"`);
        } catch (error) {
            failures.push(entry.file);
            const message = error instanceof Error ? error.message : JSON.stringify(error);
            console.error(`${prefix} ✗ ${entry.file}: ${message}`);
        }
    }

    console.log(
        `\nDone: ${entries.length - failures.length} succeeded, ${failures.length} failed.`
    );
    if (failures.length > 0) process.exitCode = 1;
};

try {
    await main();
} finally {
    await prisma.$disconnect();
}
