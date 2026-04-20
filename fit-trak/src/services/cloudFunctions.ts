import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";

type UsdaFoodSearchData = { foods: unknown[] };

const useEmulator =
  import.meta.env.DEV && import.meta.env.VITE_FUNCTIONS_EMULATOR === "true";

/** Local `npm run dev`: keys live in .env.local as USDA_API_KEY / OPENAI_API_KEY (server-side proxy). */
const useDevProxy =
  import.meta.env.DEV && !useEmulator && import.meta.env.MODE !== "test";

export function formatCallableError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code === "functions/not-found") {
      return "Cloud Functions are not deployed. From fit-trak run: firebase deploy --only functions (with secrets OPENAI_API_KEY and USDA_API_KEY), or use npm run dev with USDA_API_KEY and OPENAI_API_KEY in .env.local.";
    }
    if (code === "functions/unauthenticated" || code === "unauthenticated") {
      return "Sign in required for meal generation and food search.";
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Request failed.";
}

export async function callUsdaFoodSearch(query: string): Promise<UsdaFoodSearchData> {
  if (useDevProxy) {
    const r = await fetch(`/api/dev/usda-search?${new URLSearchParams({ query })}`);
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || `USDA dev proxy error (${r.status})`);
    }
    return r.json() as Promise<UsdaFoodSearchData>;
  }

  const fn = httpsCallable<{ query: string }, UsdaFoodSearchData>(functions, "usdaFoodSearch");
  const result = await fn({ query });
  return result.data;
}

export async function callOpenaiMealWorkout(prompt: string): Promise<{ content: string }> {
  if (useDevProxy) {
    const r = await fetch("/api/dev/openai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || `OpenAI dev proxy error (${r.status})`);
    }
    return r.json() as Promise<{ content: string }>;
  }

  const fn = httpsCallable<{ prompt: string }, { content: string }>(
    functions,
    "openaiMealWorkout"
  );
  const result = await fn({ prompt });
  return result.data;
}
