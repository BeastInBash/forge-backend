import { describe, expect, test } from 'bun:test';
import {
    checkPer100g,
    NUTRIENTS,
    scaleNutrients,
    sumNutrients,
    toNutritionReport,
    type Nutrients
} from './nutrition';

const zero = Object.fromEntries(Object.keys(NUTRIENTS).map((key) => [key, 0])) as Nutrients;

// Roughly USDA values per 100 g
const chicken: Nutrients = {
    ...zero,
    calories: 165,
    protein: 31,
    fat: 3.6,
    saturatedFat: 1,
    cholesterol: 85,
    vitaminB12: 0.34,
    sodium: 74
};
const rice: Nutrients = { ...zero, calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 };

describe('scaleNutrients', () => {
    test('scales every nutrient by grams / 100', () => {
        const scaled = scaleNutrients(chicken, 250);
        expect(scaled.calories).toBe(412.5);
        expect(scaled.protein).toBe(77.5);
        expect(scaled.vitaminB12).toBeCloseTo(0.85, 10);
    });
});

describe('sumNutrients', () => {
    test('adds item values', () => {
        const total = sumNutrients([scaleNutrients(chicken, 250), scaleNutrients(rice, 300)]);
        expect(total.calories).toBe(802.5);
        expect(total.protein).toBeCloseTo(85.6, 10);
    });
    test('is all zeros for no items', () => {
        expect(sumNutrients([])).toEqual(zero);
    });
});

describe('toNutritionReport', () => {
    test('groups and rounds', () => {
        const report = toNutritionReport(scaleNutrients(chicken, 250));
        expect(report.energy).toEqual({ calories: 413 });
        expect(report.macros.protein).toBe(77.5);
        expect(report.macros.fat).toBe(9);
        expect(report.vitamins.vitaminB12).toBe(0.85);
        expect(report.minerals.sodium).toBe(185);
    });
});

describe('checkPer100g', () => {
    test('accepts real foods', () => {
        expect(checkPer100g(chicken)).toBeNull();
        expect(checkPer100g(rice)).toBeNull();
        expect(checkPer100g({ ...zero, calories: 884, fat: 100, saturatedFat: 14 })).toBeNull();
    });
    test('accepts zero-calorie items like water', () => {
        expect(checkPer100g({ ...zero, sodium: 2 })).toBeNull();
    });
    test('rejects calories that do not match macros', () => {
        expect(checkPer100g({ ...chicken, calories: 400 })).toContain("don't match");
    });
    test('rejects more than 100 g of macros', () => {
        expect(checkPer100g({ ...zero, calories: 600, protein: 60, carbs: 60 })).toContain(
            'exceed'
        );
    });
    test('rejects sugar above carbs', () => {
        expect(checkPer100g({ ...rice, sugar: 40 })).toBe('sugar exceeds carbs');
    });
    test('rejects out-of-range and negative values', () => {
        expect(checkPer100g({ ...rice, iron: 500 })).toContain('iron');
        expect(checkPer100g({ ...rice, zinc: -1 })).toContain('zinc');
    });
});
