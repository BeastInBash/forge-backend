import { describe, expect, test } from 'bun:test';
import { toPublicId } from './cloudinary';

describe('toPublicId', () => {
    test('turns a name key into a URL-safe slug', () => {
        expect(toPublicId('barbell back squat')).toBe('barbell-back-squat');
        expect(toPublicId('t-bar row')).toBe('t-bar-row');
        expect(toPublicId('ez-bar curl (close grip)')).toBe('ez-bar-curl-close-grip');
    });

    test('drops accents and trims separators', () => {
        expect(toPublicId('  développé couché  ')).toBe('developpe-couche');
        expect(toPublicId('--push--up--')).toBe('push-up');
    });
});
