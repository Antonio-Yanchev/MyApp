/** Macros from a single USDA FDC search result item (foodNutrients format). */
export function extractMacrosFromUsdaFood(food: {
  foodNutrients?: Array<{ nutrientNumber?: string; value?: number }>;
}): { protein: number; carbs: number; fat: number; sugars: number } {
  const nutrients = food.foodNutrients || [];
  const protein = nutrients.find((n) => n.nutrientNumber === "203")?.value || 0;
  const fat = nutrients.find((n) => n.nutrientNumber === "204")?.value || 0;
  const carbs = nutrients.find((n) => n.nutrientNumber === "205")?.value || 0;
  const sugars = nutrients.find((n) => n.nutrientNumber === "269")?.value || 0;
  return {
    protein: Number(protein),
    carbs: Number(carbs),
    fat: Number(fat),
    sugars: Number(sugars),
  };
}
