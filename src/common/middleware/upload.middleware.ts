import multer from 'multer';
import ApiError from '../libs/ApiError';

/** Vercel rejects request bodies over 4.5 MB, so cap uploads just under that. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/**
 * Parses a single multipart image in the `image` field into memory (`req.file`). Size and type
 * failures reach the global error handler: `MulterError` for size, `ApiError` for type.
 */
export const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: (_req, file, accept) => {
        if (IMAGE_TYPES.has(file.mimetype)) return accept(null, true);
        accept(ApiError.badRequest('Image must be a PNG, JPEG or WebP file'));
    }
}).single('image');
