export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';
export type FitnessGoal =
  | 'lose_weight'
  | 'build_muscle'
  | 'maintain'
  | 'improve_cardio'
  | 'flexibility';

export type HealthInput = {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: Gender;
  activity_level: ActivityLevel;
  fitness_goal: FitnessGoal | null;
};

export type MacroTargets = {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type HealthMetrics = {
  bmi: number;
  bmr: number;
  tdee: number;
  daily_calorie_goal: number;
  macro_targets: MacroTargets;
  water_goal_ml: number;
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const CALORIE_ADJUSTMENTS: Record<FitnessGoal, number> = {
  lose_weight: -400,
  build_muscle: 300,
  maintain: 0,
  improve_cardio: -200,
  flexibility: 0,
};

const PROTEIN_RATIO = 0.3;
const FAT_RATIO = 0.25;
const CARBS_RATIO = 0.45;

export function calculateBMI(weight_kg: number, height_cm: number): number {
  if (weight_kg <= 0 || height_cm <= 0) return 0;
  const height_m = height_cm / 100;
  return round1(weight_kg / (height_m * height_m));
}

export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: Gender,
): number {
  if (weight_kg <= 0 || height_cm <= 0 || age <= 0) return 0;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === 'female') return round0(base - 161);
  return round0(base + 5);
}

export function calculateTDEE(bmr: number, activity_level: ActivityLevel): number {
  if (bmr <= 0) return 0;
  return round0(bmr * ACTIVITY_MULTIPLIERS[activity_level]);
}

export function calculateDailyCalorieGoal(
  tdee: number,
  fitness_goal: FitnessGoal | null,
): number {
  if (tdee <= 0) return 0;
  const adjustment = fitness_goal ? CALORIE_ADJUSTMENTS[fitness_goal] : 0;
  return Math.max(1200, round0(tdee + adjustment));
}

export function calculateMacroTargets(daily_calorie_goal: number): MacroTargets {
  if (daily_calorie_goal <= 0) {
    return { protein_g: 0, carbs_g: 0, fat_g: 0 };
  }
  const proteinCal = daily_calorie_goal * PROTEIN_RATIO;
  const fatCal = daily_calorie_goal * FAT_RATIO;
  const carbsCal = daily_calorie_goal * CARBS_RATIO;
  return {
    protein_g: round0(proteinCal / 4),
    carbs_g: round0(carbsCal / 4),
    fat_g: round0(fatCal / 9),
  };
}

export function calculateWaterGoalMl(weight_kg: number): number {
  if (weight_kg <= 0) return 2000;
  return round0(weight_kg * 35);
}

export function calculateHealthMetrics(input: HealthInput): HealthMetrics {
  const bmi = calculateBMI(input.weight_kg, input.height_cm);
  const bmr = calculateBMR(
    input.weight_kg,
    input.height_cm,
    input.age,
    input.gender,
  );
  const tdee = calculateTDEE(bmr, input.activity_level);
  const daily_calorie_goal = calculateDailyCalorieGoal(tdee, input.fitness_goal);
  const macro_targets = calculateMacroTargets(daily_calorie_goal);
  const water_goal_ml = calculateWaterGoalMl(input.weight_kg);

  return {
    bmi,
    bmr,
    tdee,
    daily_calorie_goal,
    macro_targets,
    water_goal_ml,
  };
}

export function hasCompleteHealthProfile(profile: {
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  gender?: Gender | null;
  activity_level?: ActivityLevel | null;
}): boolean {
  return (
    (profile.weight_kg ?? 0) > 0 &&
    (profile.height_cm ?? 0) > 0 &&
    (profile.age ?? 0) > 0 &&
    !!profile.gender &&
    !!profile.activity_level
  );
}

function round0(value: number): number {
  return Math.round(value);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
