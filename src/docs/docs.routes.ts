import { Router } from 'express';
import { apiReference } from '@scalar/express-api-reference';
import { asyncHandler } from '../common/utils/asyncHandler';
import { getOpenApiDocument } from './openapi';

const docsRouter = Router();

docsRouter.get(
    '/openapi.json',
    asyncHandler(async (_req, res) => {
        res.json(await getOpenApiDocument());
    })
);

docsRouter.get(
    '/docs',
    apiReference({
        url: '/openapi.json',
        pageTitle: 'Forge API Reference'
    })
);

export default docsRouter;
