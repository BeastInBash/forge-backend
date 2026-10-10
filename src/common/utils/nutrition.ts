/**
 * Every nutrient the meal endpoints report, with its unit, its group in the response and the
 * most 100 g of any food can plausibly hold (used to reject impossible AI estimates).
 *
 * The AI only supplies values per 100 g; everything else — scaling to the eaten weight, totals,
 * rounding — happens here, so the numbers always add up.
 */
export const NUTRIENTS = {
    calories: { group: 'energy', unit: 'kcal', max: 900 },
    protein: { group: 'macros', unit: 'g', max: 100 },
    carbs: { group: 'macros', unit: 'g', max: 100 },
    fat: { group: 'macros', unit: 'g', max: 100 },
    fiber: { group: 'macros', unit: 'g', max: 100 },
    sugar: { group: 'macros', unit: 'g', max: 100 },
    saturatedFat: { group: 'macros', unit: 'g', max: 100 },
    cholesterol: { group: 'macros', unit: 'mg', max: 3000 },
    vitaminA: { group: 'vitamins', unit: 'µg', max: 30000 },
    vitaminB1: { group: 'vitamins', unit: 'mg', max: 50 },
    vitaminB2: { group: 'vitamins', unit: 'mg', max: 50 },
    vitaminB3: { group: 'vitamins', unit: 'mg', max: 200 },
    vitaminB6: { group: 'vitamins', unit: 'mg', max: 50 },
    vitaminB12: { group: 'vitamins', unit: 'µg', max: 200 },
    folate: { group: 'vitamins', unit: 'µg', max: 5000 },
    vitaminC: { group: 'vitamins', unit: 'mg', max: 3000 },
    vitaminD: { group: 'vitamins', unit: 'µg', max: 500 },
    vitaminE: { group: 'vitamins', unit: 'mg', max: 200 },
    vitaminK: { group: 'vitamins', unit: 'µg', max: 2000 },
    calcium: { group: 'minerals', unit: 'mg', max: 3000 },
    iron: { group: 'minerals', unit: 'mg', max: 100 },
    magnesium: { group: 'minerals', unit: 'mg', max: 1000 },
    phosphorus: { group: 'minerals', unit: 'mg', max: 2000 },
    potassium: { group: 'minerals', unit: 'mg', max: 10000 },
    sodium: { group: 'minerals', unit: 'mg', max: 40000 },
    zinc: { group: 'minerals', unit: 'mg', max: 100 }
} as const;

export type NutrientKey = keyof typeof NUTRIENTS;
export type NutrientGroup = (typeof NUTRIENTS)[NutrientKey]['group'];
export type Nutrients = Record<NutrientKey, number>;

const NUTRIENT_KEYS = Object.keys(NUTRIENTS) as NutrientKey[];

/** Unit of each nutrient, e.g. `{ calories: 'kcal', protein: 'g', ... }`, for API consumers. */
export const NUTRIENT_UNITS = Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [key, NUTRIENTS[key].unit])
) as Record<NutrientKey, string>;

const mapNutrients = (fn: (key: NutrientKey) => number): Nutrients =>
    Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, fn(key)])) as Nutrients;

/** Nutrients in `grams` of a food, from its values per 100 g. */
export const scaleNutrients = (per100g: Nutrients, grams: number): Nutrients =>
    mapNutrients((key) => (per100g[key] * grams) / 100);

export const sumNutrients = (list: Nutrients[]): Nutrients =>
    mapNutrients((key) => list.reduce((total, item) => total + item[key], 0));

const round = (value: number, decimals: number) => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

/**
 * Rounds for display and splits into `{ energy, macros, vitamins, minerals }`. Only call this on
 * final values — summing rounded numbers is how totals stop adding up.
 */
export const toNutritionReport = (values: Nutrients) => {
    const report = { energy: {}, macros: {}, vitamins: {}, minerals: {} } as Record<
        NutrientGroup,
        Partial<Nutrients>
    >;
    for (const key of NUTRIENT_KEYS) {
        // Whole kcal; one decimal for grams; two for the small mg/µg amounts like B12
        const decimals = key === 'calories' ? 0 : NUTRIENTS[key].unit === 'g' ? 1 : 2;
        report[NUTRIENTS[key].group][key] = round(values[key], decimals);
    }
    return report;
};

/**
 * Sanity checks on one food's values per 100 g. Returns why it is implausible, or null.
 * AI estimates that are invented rather than looked up rarely pass the energy check.
 */
export const checkPer100g = (per100g: Nutrients): string | null => {
    for (const key of NUTRIENT_KEYS) {
        const value = per100g[key];
        if (!Number.isFinite(value) || value < 0 || value > NUTRIENTS[key].max) {
            return `${key} out of range (${value})`;
        }
    }
    const { calories, protein, carbs, fat, sugar, saturatedFat } = per100g;
    if (protein + carbs + fat > 101) return 'protein + carbs + fat exceed 100 g per 100 g';
    if (sugar > carbs + 1) return 'sugar exceeds carbs';
    if (saturatedFat > fat + 1) return 'saturated fat exceeds fat';
    // Atwater factors; the margin covers fibre, rounding and alcohol in small amounts
    const fromMacros = 4 * protein + 4 * carbs + 9 * fat;
    if (Math.abs(fromMacros - calories) > Math.max(calories * 0.25, 20)) {
        return `calories (${calories}) don't match macros (${Math.round(fromMacros)})`;
    }
    return null;
};
