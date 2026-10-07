import { describe, expect, test } from 'bun:test';
import { etagFor, matchesIfNoneMatch } from './conditionalJson';

describe('conditional JSON', () => {
    test('same body, same ETag; different body, different ETag', () => {
        expect(etagFor('{"a":1}')).toBe(etagFor('{"a":1}'));
        expect(etagFor('{"a":1}')).not.toBe(etagFor('{"a":2}'));
        expect(etagFor('{"a":1}')).toStartWith('W/"');
    });

    test('matches single, listed, strong-vs-weak and wildcard If-None-Match', () => {
        const tag = etagFor('x');
        expect(matchesIfNoneMatch(tag, tag)).toBe(true);
        expect(matchesIfNoneMatch(`W/"other", ${tag}`, tag)).toBe(true);
        expect(matchesIfNoneMatch(tag.replace(/^W\//, ''), tag)).toBe(true);
        expect(matchesIfNoneMatch('*', tag)).toBe(true);
        expect(matchesIfNoneMatch('W/"other"', tag)).toBe(false);
        expect(matchesIfNoneMatch(undefined, tag)).toBe(false);
    });
});
