import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';

/** A weak ETag for a JSON body: same content, same tag. */
export const etagFor = (json: string): string =>
    `W/"${createHash('sha1').update(json).digest('base64url')}"`;

/** If-None-Match uses weak comparison: `W/"x"` and `"x"` match. */
const opaqueTag = (tag: string) => tag.trim().replace(/^W\//, '');

/** True when an If-None-Match header (possibly a list, or `*`) includes `etag`. */
export const matchesIfNoneMatch = (header: string | undefined, etag: string): boolean => {
    if (!header) return false;
    return header
        .split(',')
        .some((tag) => tag.trim() === '*' || opaqueTag(tag) === opaqueTag(etag));
};

/**
 * Sends `body` as JSON with an ETag, or a bodiless 304 when the client's If-None-Match already
 * has it. Express's own freshness check isn't used: it ignores If-None-Match whenever the
 * request carries `Cache-Control: no-cache`, which browsers add to any fetch that sets
 * If-None-Match itself.
 */
export const sendConditionalJson = (req: Request, res: Response, body: unknown) => {
    const json = JSON.stringify(body);
    const etag = etagFor(json);
    res.set({ ETag: etag, 'Cache-Control': 'private, no-cache' });
    if (matchesIfNoneMatch(req.get('if-none-match'), etag)) return res.status(304).end();
    return res.type('json').send(json);
};
