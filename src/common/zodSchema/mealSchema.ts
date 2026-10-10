import { z } from 'zod';
import { NUTRIENTS, type NutrientKey } from '../utils/nutrition';

export const mealTimeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

/**
 * The JSON body for `POST /api/v1/meals/analyze`: food name → amount and preparation, as the
 * user would say it.
 *
 * @example { "mealTime": "lunch", "mealItem": { "Chicken": "250g cooked", "Rice": "300g cooked" } }
 */
const mealItemsSchema = z
    .record(
        z.string().trim().min(1).max(60),
        z.string().trim().min(1).max(100).meta({
            description: 'Amount and preparation, e.g. "250g cooked" or "2 pieces"'
        })
    )
    .refine((items) => Object.keys(items).length >= 1, 'Add at least one food')
    .refine((items) => Object.keys(items).length <= 20, 'At most 20 foods per meal');

export type MealItems = z.infer<typeof mealItemsSchema>;

export const analyzeMealBodySchema = z
    .strictObject({
        mealTime: mealTimeSchema,
        mealItem: mealItemsSchema
    })
    .meta({
        id: 'AnalyzeMealBody',
        example: { mealTime: 'lunch', mealItem: { Chicken: '250g cooked', Rice: '300g cooked' } }
    });

export type AnalyzeMealBody = z.infer<typeof analyzeMealBodySchema>;

/** The JSON body for `POST /api/v1/meals`: a meal to analyse and save. */
export const createMealBodySchema = z
    .strictObject({
        mealTime: mealTimeSchema,
        mealItem: mealItemsSchema,
        /** When it was eaten; defaults to now. ISO 8601 with offset. */
        eatenAt: z.iso
            .datetime({ offset: true })
            .transform((value) => new Date(value))
            // A little slack for clocks that run ahead of the server's
            .refine((date) => date.getTime() <= Date.now() + 10 * 60_000, "Can't be in the future")
            .optional()
    })
    .meta({
        id: 'CreateMealBody',
        example: {
            mealTime: 'lunch',
            mealItem: { Chicken: '250g cooked', Rice: '300g cooked' },
            eatenAt: '2026-10-10T13:15:00+05:30'
        }
    });

export type CreateMealBody = z.infer<typeof createMealBodySchema>;

/** Query for `GET /api/v1/meals`. */
export const listMealsQuerySchema = z.strictObject({
    /** Only meals eaten before this time: the previous page's `nextBefore` */
    before: z.iso
        .datetime({ offset: true })
        .transform((value) => new Date(value))
        .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30)
});

export type ListMealsQuery = z.infer<typeof listMealsQuerySchema>;

/** Route params for `/api/v1/meals/:mealId`. */
export const mealIdParamsSchema = z.strictObject({ mealId: z.uuid() });

export type MealIdParams = z.infer<typeof mealIdParamsSchema>;

// ─── What the AI must return ────────────────────────────────────────────────────────────────

/** Values per 100 g of the food, one field per entry in NUTRIENTS. */
const per100gSchema = z.strictObject(
    Object.fromEntries(
        Object.entries(NUTRIENTS).map(([key, { unit, max }]) => [
            key,
            z
                .number()
                .min(0)
                .max(max)
                .meta({ description: `${unit} per 100 g` })
        ])
    ) as Record<NutrientKey, z.ZodNumber>
);

/**
 * One analysed food. Deliberately no totals: the model estimates weight and composition, our
 * code does the arithmetic (see MEAL_LOGGING.md §1).
 */
export const aiFoodSchema = z.strictObject({
    /** Position of the food in the request, so answers can't be mismatched or dropped */
    index: z.int().min(0).max(19),
    /** False when the entry isn't food or drink; the other values are then ignored */
    isFood: z.boolean(),
    name: z.string().min(1).max(80).meta({ description: 'Clear English name of the food' }),
    grams: z.number().min(0).max(3000).meta({ description: 'Estimated edible weight eaten' }),
    state: z.enum(['raw', 'cooked']).nullable(),
    per100g: per100gSchema,
    assumption: z
        .string()
        .max(160)
        .nullable()
        .meta({ description: 'What was assumed, shown to the user' }),
    confidence: z.number().min(0).max(1)
});

export const aiMealSchema = z.strictObject({ items: z.array(aiFoodSchema).min(1).max(20) });

export type AiFood = z.infer<typeof aiFoodSchema>;
