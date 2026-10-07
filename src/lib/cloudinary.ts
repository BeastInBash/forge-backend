import { v2 as cloudinary } from 'cloudinary';
import ApiError from '../common/libs/ApiError';
import { env } from './env';

// Configured from the validated env rather than the SDK's own process.env lookup, which can run
// before dotenv has loaded .env.
const credentials = env.CLOUDINARY_URL?.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
if (credentials) {
    const [, apiKey, apiSecret, cloudName] = credentials;
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
}

export const isCloudinaryConfigured = Boolean(credentials);

/** Cloudinary folder holding the catalog's exercise images. */
export const EXERCISE_IMAGE_FOLDER = 'forge/exercises';

/** `barbell back squat` → `barbell-back-squat`: a stable public id per exercise. */
export const toPublicId = (nameKey: string): string =>
    nameKey
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

/**
 * Uploads an exercise image and returns its HTTPS URL.
 *
 * The original is stored as uploaded (lossless PNG); clients add delivery transformations such
 * as `f_auto,q_auto,w_192` to the URL, so each device gets AVIF/WebP at the size it needs. The
 * public id comes from the exercise name, so re-uploading replaces the image instead of adding
 * a copy.
 *
 * The bytes go up as a `data:` URI: under Bun, the SDK's streamed upload of a file path is
 * rejected by Cloudinary ("Invalid request parameters") for anything but tiny files.
 */
export const uploadExerciseImage = async (
    image: { buffer: Uint8Array; mimetype: string },
    nameKey: string
): Promise<string> => {
    if (!isCloudinaryConfigured) {
        throw new ApiError(503, 'Image uploads are not configured (CLOUDINARY_URL is missing)');
    }
    const publicId = toPublicId(nameKey);
    if (!publicId)
        throw ApiError.badRequest('Exercise name has no usable characters for an image id');

    try {
        const dataUri = `data:${image.mimetype};base64,${Buffer.from(image.buffer).toString('base64')}`;
        const result = await cloudinary.uploader.upload(dataUri, {
            folder: EXERCISE_IMAGE_FOLDER,
            public_id: publicId,
            resource_type: 'image',
            overwrite: true,
            // Purge cached copies of the old image from the CDN when it is replaced
            invalidate: true
        });
        return result.secure_url;
    } catch (error) {
        // The SDK rejects with a plain `{ message, http_code }` object, not an Error
        const message =
            error instanceof Error
                ? error.message
                : ((error as { message?: string } | undefined)?.message ?? 'unknown error');
        throw new ApiError(502, `Image upload to Cloudinary failed: ${message}`);
    }
};
