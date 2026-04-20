import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

const openaiApiKey = defineSecret("OPENAI_API_KEY");
const usdaApiKey = defineSecret("USDA_API_KEY");

export const usdaFoodSearch = onCall(
  { secrets: [usdaApiKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const query = request.data?.query;
    if (typeof query !== "string" || !query.trim()) {
      throw new HttpsError("invalid-argument", "Missing or invalid query.");
    }

    const key = usdaApiKey.value();
    const params = new URLSearchParams({
      query: query.trim(),
      api_key: key,
    });
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      logger.error("USDA HTTP error", { status: res.status, body });
      throw new HttpsError("internal", "USDA FoodData Central request failed.");
    }

    const data = (await res.json()) as { foods?: unknown[] };
    return { foods: data.foods ?? [] };
  }
);

export const openaiMealWorkout = onCall(
  { secrets: [openaiApiKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const prompt = request.data?.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new HttpsError("invalid-argument", "Missing or invalid prompt.");
    }

    const key = openaiApiKey.value();
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("OpenAI HTTP error", { status: res.status, body });
      throw new HttpsError("internal", "OpenAI request failed.");
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new HttpsError("internal", "No content in OpenAI response.");
    }
    return { content };
  }
);
