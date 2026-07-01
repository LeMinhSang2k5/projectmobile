export type LimitStatus = {
  isOver: boolean;
  current: number;
  goal: number;
  excess: number;
  percent: number;
};

export type MacroLimitItem = {
  label: string;
  current: number;
  goal: number;
  isOver: boolean;
  excess: number;
};

export function getLimitStatus(current: number, goal: number): LimitStatus {
  const safeGoal = Math.max(goal, 1);
  const excess = Math.max(0, current - goal);
  return {
    isOver: current > goal,
    current,
    goal,
    excess,
    percent: Math.round((current / safeGoal) * 100),
  };
}

export function getCalorieLimitStatus(current: number, goal: number): LimitStatus {
  return getLimitStatus(current, goal);
}

export function getWaterLimitStatus(currentMl: number, goalMl: number): LimitStatus {
  return getLimitStatus(currentMl, goalMl);
}

export function getMacroLimitItems(
  protein: number,
  carbs: number,
  fat: number,
  goals: { protein_g: number; carbs_g: number; fat_g: number },
): MacroLimitItem[] {
  const items = [
    { label: 'Đạm', current: protein, goal: goals.protein_g },
    { label: 'Carbs', current: carbs, goal: goals.carbs_g },
    { label: 'Béo', current: fat, goal: goals.fat_g },
  ];
  return items.map((item) => ({
    ...item,
    isOver: item.current > item.goal,
    excess: Math.max(0, item.current - item.goal),
  }));
}

export function getOverMacroLabels(items: MacroLimitItem[]): string[] {
  return items.filter((i) => i.isOver).map((i) => `${i.label} +${i.excess}g`);
}

export function calorieOverMessage(status: LimitStatus): string {
  if (!status.isOver) return '';
  return `Bạn đã vượt mục tiêu calo ${status.excess} kcal (${status.percent}% mục tiêu).`;
}

export function waterOverMessage(status: LimitStatus): string {
  if (!status.isOver) return '';
  return `Bạn đã uống vượt mục tiêu ${status.excess} ml (${status.percent}% mục tiêu).`;
}

export function projectedCalorieOverMessage(
  current: number,
  added: number,
  goal: number,
): string | null {
  const projected = current + added;
  if (projected <= goal) return null;
  const excess = projected - goal;
  return `Thêm món này sẽ vượt mục tiêu calo khoảng ${excess} kcal. Bạn vẫn muốn thêm?`;
}

export function projectedWaterOverMessage(
  currentMl: number,
  addMl: number,
  goalMl: number,
): string | null {
  const projected = currentMl + addMl;
  if (projected <= goalMl) return null;
  const excess = projected - goalMl;
  return `Thêm ${addMl}ml sẽ vượt mục tiêu nước khoảng ${excess} ml. Bạn vẫn muốn tiếp tục?`;
}

export function getRemainingCalories(current: number, goal: number): number {
  return Math.max(0, goal - current);
}

export function getRemainingWaterMl(currentMl: number, goalMl: number): number {
  return Math.max(0, goalMl - currentMl);
}

/** Khẩu phần lớn nhất (từ danh sách) vẫn không vượt mục tiêu calo còn lại. */
export function getMaxFoodQuantityWithinCalorieLimit(
  foodCaloriesPerServing: number,
  currentCalories: number,
  goal: number,
  quantityOptions: readonly number[] = [0.5, 1, 1.5, 2],
): number | null {
  const remaining = getRemainingCalories(currentCalories, goal);
  if (remaining < 60 || foodCaloriesPerServing <= 0) return null;

  let best: number | null = null;
  let bestCalories = 0;
  for (const quantity of quantityOptions) {
    const calories = Math.round(foodCaloriesPerServing * quantity);
    if (calories <= remaining && calories >= 60 && calories > bestCalories) {
      best = quantity;
      bestCalories = calories;
    }
  }
  return best;
}

export function getFoodCaloriesAtQuantity(
  foodCaloriesPerServing: number,
  quantity: number,
): number {
  return Math.round(foodCaloriesPerServing * quantity);
}

export function isFoodQuantityOverCalorieLimit(
  foodCaloriesPerServing: number,
  quantity: number,
  currentCalories: number,
  goal: number,
): boolean {
  const added = getFoodCaloriesAtQuantity(foodCaloriesPerServing, quantity);
  return currentCalories + added > goal;
}

export function getCalorieOverExcessAtQuantity(
  foodCaloriesPerServing: number,
  quantity: number,
  currentCalories: number,
  goal: number,
): number {
  const projected = currentCalories + getFoodCaloriesAtQuantity(foodCaloriesPerServing, quantity);
  return Math.max(0, projected - goal);
}
