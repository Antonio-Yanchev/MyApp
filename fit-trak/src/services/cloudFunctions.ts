import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";

type UsdaFoodSearchData = { foods: unknown[] };

export async function callUsdaFoodSearch(query: string): Promise<UsdaFoodSearchData> {
  const fn = httpsCallable<{ query: string }, UsdaFoodSearchData>(functions, "usdaFoodSearch");
  const result = await fn({ query });
  return result.data;
}

export async function callOpenaiMealWorkout(prompt: string): Promise<{ content: string }> {
  const fn = httpsCallable<{ prompt: string }, { content: string }>(
    functions,
    "openaiMealWorkout"
  );
  const result = await fn({ prompt });
  return result.data;
}
