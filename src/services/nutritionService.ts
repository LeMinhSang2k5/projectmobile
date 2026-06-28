import { supabase } from '../../utils/supabase';
import type {
  DailyNutrition,
  Food,
  MealItem,
  MealLogWithItems,
  MealType,
  SuggestedMealItem,
  SuggestedMeals,
} from '../types';
import { toLocalDateString } from '../lib/dateUtils';

const today = () => toLocalDateString();

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

export async function addMealItem(
  userId: string,
  date: string,
  mealType: MealType,
  foodId: string,
  quantity: number,
): Promise<MealItem> {
  if (!userId) throw new Error('Bạn cần đăng nhập để thêm món ăn');
  const { data, error } = await supabase.rpc('add_meal_item_atomic', {
    p_date: date,
    p_meal_type: mealType,
    p_food_id: foodId,
    p_quantity: quantity,
  });

  if (error) throw error;
  return data as MealItem;
}

export async function removeMealItem(
  userId: string,
  itemId: string,
  date: string,
): Promise<void> {
  if (!userId || !date) throw new Error('Dữ liệu xóa món không hợp lệ');
  const { error } = await supabase.rpc('remove_meal_item_atomic', {
    p_item_id: itemId,
  });
  if (error) throw error;
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
