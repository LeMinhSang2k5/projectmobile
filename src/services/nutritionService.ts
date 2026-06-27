import { supabase } from '../../utils/supabase';
import type {
  DailyNutrition,
  Food,
  MealItem,
  MealLog,
  MealLogWithItems,
  MealType,
  SuggestedMealItem,
  SuggestedMeals,
} from '../types';

const today = () => new Date().toISOString().split('T')[0];

export async function searchFoods(query: string, limit = 20): Promise<Food[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .ilike('name', `%${trimmed}%`)
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Food[];
}

export async function getFoodById(foodId: string): Promise<Food | null> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('id', foodId)
    .maybeSingle();
  if (error) throw error;
  return data as Food | null;
}

export async function getOrCreateMealLog(
  userId: string,
  date: string,
  mealType: MealType,
): Promise<MealLog> {
  const { data: existing } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .maybeSingle();

  if (existing) return existing as MealLog;

  const { data, error } = await supabase
    .from('meal_logs')
    .insert({ user_id: userId, date, meal_type: mealType })
    .select()
    .single();

  if (error) throw error;
  return data as MealLog;
}

function scaleNutrients(food: Food, quantity: number) {
  return {
    calories: Math.round(food.calories * quantity),
    protein_g: Math.round(food.protein_g * quantity),
    carbs_g: Math.round(food.carbs_g * quantity),
    fat_g: Math.round(food.fat_g * quantity),
  };
}

export async function addMealItem(
  userId: string,
  date: string,
  mealType: MealType,
  foodId: string,
  quantity: number,
): Promise<MealItem> {
  if (quantity <= 0) throw new Error('Khẩu phần phải lớn hơn 0');

  const food = await getFoodById(foodId);
  if (!food) throw new Error('Không tìm thấy món ăn');

  const mealLog = await getOrCreateMealLog(userId, date, mealType);
  const nutrients = scaleNutrients(food, quantity);

  const { data, error } = await supabase
    .from('meal_items')
    .insert({
      meal_log_id: mealLog.id,
      food_id: foodId,
      quantity,
      ...nutrients,
    })
    .select()
    .single();

  if (error) throw error;
  await recalcDailyNutrition(userId, date);
  return data as MealItem;
}

export async function removeMealItem(
  userId: string,
  itemId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase.from('meal_items').delete().eq('id', itemId);
  if (error) throw error;
  await recalcDailyNutrition(userId, date);
}

export async function getMealsByDate(
  userId: string,
  date: string,
): Promise<MealLogWithItems[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('*, meal_items(*, foods(*))')
    .eq('user_id', userId)
    .eq('date', date)
    .order('meal_type');

  if (error) throw error;
  return (data ?? []) as MealLogWithItems[];
}

export async function getDailyNutrition(
  userId: string,
  date: string = today(),
): Promise<DailyNutrition | null> {
  const { data, error } = await supabase
    .from('daily_nutrition')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data as DailyNutrition | null;
}

export async function recalcDailyNutrition(
  userId: string,
  date: string,
): Promise<DailyNutrition | null> {
  const meals = await getMealsByDate(userId, date);
  const totals = meals.reduce(
    (acc, meal) => {
      for (const item of meal.meal_items ?? []) {
        acc.calories_consumed += item.calories ?? 0;
        acc.protein_g += item.protein_g ?? 0;
        acc.carbs_g += item.carbs_g ?? 0;
        acc.fat_g += item.fat_g ?? 0;
      }
      return acc;
    },
    { calories_consumed: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  const { data: existing } = await supabase
    .from('daily_nutrition')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('daily_nutrition')
      .update(totals)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as DailyNutrition;
  }

  const { data, error } = await supabase
    .from('daily_nutrition')
    .insert({ user_id: userId, date, ...totals })
    .select()
    .single();
  if (error) throw error;
  return data as DailyNutrition;
}

const SUGGESTION_SPLIT: Record<'breakfast' | 'lunch' | 'dinner', number> = {
  breakfast: 0.3,
  lunch: 0.4,
  dinner: 0.3,
};

const MEAL_KEYWORDS: Record<'breakfast' | 'lunch' | 'dinner', string[]> = {
  breakfast: ['bánh mì', 'cháo', 'xôi', 'trứng', 'sữa', 'chuối', 'táo', 'yogurt', 'phở', 'hủ tiếu'],
  lunch: ['cơm', 'bún', 'mì', 'thịt', 'gà', 'cá', 'tôm', 'canh', 'salad'],
  dinner: ['cơm', 'phở', 'bún', 'cá', 'gà', 'thịt', 'canh', 'rau', 'salad'],
};

const QUANTITY_OPTIONS = [0.5, 1, 1.5] as const;

export async function getSuggestedMeals(
  dailyCalorieGoal: number,
): Promise<SuggestedMeals> {
  const safeGoal = Math.max(dailyCalorieGoal, 1600);
  const allFoods = await getSuggestionFoods();

  const usedIds = new Set<string>();
  const breakfast = buildMealSuggestion(allFoods, safeGoal * SUGGESTION_SPLIT.breakfast, MEAL_KEYWORDS.breakfast, usedIds);
  const lunch = buildMealSuggestion(allFoods, safeGoal * SUGGESTION_SPLIT.lunch, MEAL_KEYWORDS.lunch, usedIds);
  const dinner = buildMealSuggestion(allFoods, safeGoal * SUGGESTION_SPLIT.dinner, MEAL_KEYWORDS.dinner, usedIds);

  return { breakfast, lunch, dinner };
}

async function getSuggestionFoods(): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('is_custom', false)
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Food[];
}

function buildMealSuggestion(
  foods: Food[],
  targetCalories: number,
  keywords: string[],
  usedIds: Set<string>,
): SuggestedMealItem[] {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const keywordFoods = foods.filter((f) =>
    lowerKeywords.some((k) => f.name.toLowerCase().includes(k)),
  );
  const candidates = (keywordFoods.length > 0 ? keywordFoods : foods).filter(
    (f) => !usedIds.has(f.id),
  );

  if (candidates.length === 0) return [];

  const selected: SuggestedMealItem[] = [];
  let remaining = Math.max(targetCalories, 350);
  const maxItems = 3;

  for (let index = 0; index < maxItems; index += 1) {
    const desired = remaining / (maxItems - index);
    const best = pickBestFood(candidates, desired, usedIds);
    if (!best) break;
    selected.push(best);
    usedIds.add(best.food.id);
    remaining -= best.estimatedCalories;
    if (remaining < 120) break;
  }

  return selected;
}

function pickBestFood(
  foods: Food[],
  desiredCalories: number,
  usedIds: Set<string>,
): SuggestedMealItem | null {
  let best: SuggestedMealItem | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const food of foods) {
    if (usedIds.has(food.id)) continue;
    for (const quantity of QUANTITY_OPTIONS) {
      const calories = Math.round(food.calories * quantity);
      if (calories < 60 || calories > 520) continue;
      const score = Math.abs(calories - desiredCalories);
      if (score < bestScore) {
        bestScore = score;
        best = { food, quantity, estimatedCalories: calories };
      }
    }
  }

  return best;
}
