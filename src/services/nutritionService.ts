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
  breakfast: ['bánh mì', 'cháo', 'xôi', 'trứng', 'sữa', 'chuối', 'táo', 'yogurt', 'yến mạch', 'hủ tiếu'],
  lunch: ['cơm tấm', 'cơm gà', 'bún chả', 'mì quảng', 'thịt bò', 'tôm', 'nem', 'gỏi cuốn', 'canh'],
  dinner: ['phở', 'bún riêu', 'cá', 'rau', 'salad', 'đậu phụ', 'khoai', 'lẩu', 'gạo lứt'],
};

const QUANTITY_OPTIONS = [0.5, 1, 1.5] as const;

function hashDateSeed(date: string, salt: string): number {
  let hash = 2166136261;
  const input = `${date}|${salt}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function sumMealCalories(items: SuggestedMealItem[]): number {
  return items.reduce((sum, item) => sum + item.estimatedCalories, 0);
}

/** Chuẩn hóa tên món để so sánh (bỏ phần trong ngoặc, gộp khoảng trắng). */
function normalizeFoodKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nhóm món gần giống nhau — mỗi nhóm chỉ xuất hiện một lần trong cả ngày. */
const DEDUP_GROUP_PATTERNS: [RegExp, string][] = [
  [/ức gà/i, 'uc-ga'],
  [/thịt gà|gà xé|đùi gà|cháo gà|cơm gà/i, 'ga-khac'],
  [/trứng|lòng trắng/i, 'trung'],
  [/yến mạch/i, 'yen-mach'],
  [/whey|casein|protein shake|thanh protein/i, 'protein-bo'],
  [/khoai lang/i, 'khoai-lang'],
  [/khoai tây/i, 'khoai-tay'],
  [/bánh mì/i, 'banh-mi'],
  [/sữa chua|yogurt/i, 'sua-chua'],
  [/cá hồi/i, 'ca-hoi'],
  [/cá ngừ/i, 'ca-ngu'],
  [/cá thu/i, 'ca-thu'],
];

function getFoodDedupKey(name: string): string {
  for (const [pattern, key] of DEDUP_GROUP_PATTERNS) {
    if (pattern.test(name)) return key;
  }
  return normalizeFoodKey(name);
}

type UsedFoodTracker = {
  ids: Set<string>;
  keys: Set<string>;
};

function createUsedFoodTracker(): UsedFoodTracker {
  return { ids: new Set<string>(), keys: new Set<string>() };
}

function isFoodUsed(tracker: UsedFoodTracker, food: Food): boolean {
  return tracker.ids.has(food.id) || tracker.keys.has(getFoodDedupKey(food.name));
}

function markFoodUsed(tracker: UsedFoodTracker, food: Food): void {
  tracker.ids.add(food.id);
  tracker.keys.add(getFoodDedupKey(food.name));
}

function dedupeFoods(foods: Food[]): Food[] {
  const seen = new Set<string>();
  return foods.filter((food) => {
    const key = getFoodDedupKey(food.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getSuggestedMeals(
  dailyCalorieGoal: number,
  date: string = toLocalDateString(),
): Promise<SuggestedMeals> {
  const dailyBudget = Math.round(Math.max(dailyCalorieGoal, 0));
  if (dailyBudget === 0) {
    return { breakfast: [], lunch: [], dinner: [] };
  }

  const allFoods = dedupeFoods(await getSuggestionFoods());
  const used = createUsedFoodTracker();
  const dailyRemaining = { value: dailyBudget };
  const rng = createSeededRandom(hashDateSeed(date, String(dailyBudget)));

  const breakfast = buildMealSuggestion(
    allFoods,
    Math.round(dailyBudget * SUGGESTION_SPLIT.breakfast),
    dailyRemaining,
    MEAL_KEYWORDS.breakfast,
    used,
    rng,
  );
  const lunch = buildMealSuggestion(
    allFoods,
    Math.round(dailyBudget * SUGGESTION_SPLIT.lunch),
    dailyRemaining,
    MEAL_KEYWORDS.lunch,
    used,
    rng,
  );
  const dinner = buildMealSuggestion(
    allFoods,
    Math.round(dailyBudget * SUGGESTION_SPLIT.dinner),
    dailyRemaining,
    MEAL_KEYWORDS.dinner,
    used,
    rng,
  );

  const result = { breakfast, lunch, dinner };
  const total = sumMealCalories(breakfast) + sumMealCalories(lunch) + sumMealCalories(dinner);
  if (total > dailyBudget) {
    console.warn(`Gợi ý thực đơn vượt mục tiêu: ${total}/${dailyBudget} kcal`);
  }

  return result;
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
  plannedMealBudget: number,
  dailyRemaining: { value: number },
  keywords: string[],
  used: UsedFoodTracker,
  rng: () => number,
): SuggestedMealItem[] {
  const mealBudget = Math.min(Math.max(plannedMealBudget, 0), dailyRemaining.value);
  if (mealBudget < 60) return [];

  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const keywordFoods = foods.filter((f) =>
    lowerKeywords.some((k) => f.name.toLowerCase().includes(k)),
  );
  const pool = keywordFoods.length > 0 ? keywordFoods : foods;
  const candidates = shuffleWithRng(
    pool.filter((f) => !isFoodUsed(used, f)),
    rng,
  );

  if (candidates.length === 0) return [];

  const selected: SuggestedMealItem[] = [];
  let mealSpent = 0;
  let remainingMeal = mealBudget;
  const maxItems = 3;

  for (let index = 0; index < maxItems; index += 1) {
    if (remainingMeal < 60 || dailyRemaining.value < 60) break;

    const desired = remainingMeal / (maxItems - index);
    const maxForPick = Math.min(remainingMeal, dailyRemaining.value);
    const best = pickBestFood(candidates, desired, used, maxForPick, rng);
    if (!best) break;

    selected.push(best);
    markFoodUsed(used, best.food);
    mealSpent += best.estimatedCalories;
    remainingMeal = mealBudget - mealSpent;
    if (remainingMeal < 60) break;
  }

  dailyRemaining.value = Math.max(0, dailyRemaining.value - mealSpent);
  return selected;
}

function pickBestFood(
  foods: Food[],
  desiredCalories: number,
  used: UsedFoodTracker,
  maxCalories: number,
  rng: () => number,
): SuggestedMealItem | null {
  let best: SuggestedMealItem | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const food of foods) {
    if (isFoodUsed(used, food)) continue;
    for (const quantity of QUANTITY_OPTIONS) {
      const calories = Math.round(food.calories * quantity);
      if (calories < 60 || calories > maxCalories) continue;
      const score = Math.abs(calories - desiredCalories);
      const tieBreak = score <= 25 ? rng() * 8 : 0;
      const adjustedScore = score + tieBreak;
      if (adjustedScore < bestScore) {
        bestScore = adjustedScore;
        best = { food, quantity, estimatedCalories: calories };
      }
    }
  }

  return best;
}
