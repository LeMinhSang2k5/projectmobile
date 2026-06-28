import {
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  calculateWaterGoalMl,
  calculateHealthMetrics,
  calculateMacroTargets,
} from './healthCalculations';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertClose(actual: number, expected: number, tolerance: number, label: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`FAIL: ${label} — expected ${expected}, got ${actual}`);
  }
}

export function runHealthCalculationTests(): void {
  assertClose(calculateBMI(70, 175), 22.9, 0.1, 'BMI 70kg 175cm');
  assert(calculateBMR(70, 175, 30, 'male') === 1649, 'BMR male');
  assert(calculateBMR(60, 165, 28, 'female') === 1330, 'BMR female');
  assert(calculateBMR(70, 175, 30, 'other') === 1566, 'BMR neutral');
  assert(calculateTDEE(1649, 'sedentary') === 1979, 'TDEE sedentary');
  assert(calculateTDEE(1649, 'very_active') === 2845, 'TDEE very_active');
  assert(calculateWaterGoalMl(70) === 2450, 'water 70kg');
  assert(calculateWaterGoalMl(0) === 2000, 'water fallback');

  const metrics = calculateHealthMetrics({
    weight_kg: 70,
    height_cm: 175,
    age: 30,
    gender: 'male',
    activity_level: 'moderately_active',
    fitness_goal: 'lose_weight',
  });
  assert(metrics.bmr === 1649, 'metrics BMR');
  assert(metrics.tdee === 2556, 'metrics TDEE moderate');
  assert(metrics.daily_calorie_goal === 2156, 'metrics calorie goal lose_weight');
  assert(metrics.water_goal_ml === 2450, 'metrics water');

  const macros = calculateMacroTargets(2100);
  assert(macros.protein_g === 158, 'macro protein');
  assert(macros.carbs_g === 236, 'macro carbs');
  assert(macros.fat_g === 58, 'macro fat');
}

runHealthCalculationTests();
console.log('All health calculation tests passed.');
