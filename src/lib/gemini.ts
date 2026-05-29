const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 8;
const BASE_DELAY_MS = 1500;
const DEFAULT_COOLDOWN_MS = 5000; // 5s — short cooldown to avoid over-blocking keys
const MIN_KEY_SPACING_MS = 300; // 300ms between uses of same key
const MAX_WAIT_FOR_COOLDOWN_MS = 30000; // Wait up to 30s for keys to cool down before giving up

let keyIndex = 0;

const keyCooldowns = new Map<string, number>();
const keyLastUsed = new Map<string, number>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Strip markdown fences, thinking tags, and trailing junk from AI JSON responses */
function cleanJsonResponse(raw: string): string {
  let text = raw.trim();
  // Remove <think>...</think> blocks (gemini-2.5 thinking output)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Remove markdown code fences: ```json ... ``` or ``` ... ```
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  // Try to extract just the JSON object/array if there's trailing text
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket) ? firstBrace : firstBracket;
  if (start > 0) {
    text = text.slice(start);
  }
  // Find matching closing brace/bracket from the end
  if (text.startsWith("{")) {
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace > 0) text = text.slice(0, lastBrace + 1);
  } else if (text.startsWith("[")) {
    const lastBracket = text.lastIndexOf("]");
    if (lastBracket > 0) text = text.slice(0, lastBracket + 1);
  }
  return text;
}

function apiKeys(customKey?: string): string[] {
  if (customKey?.trim()) return [customKey.trim()];

  const list = process.env.GEMINI_API_KEYS?.split(",").map((k) => k.trim()).filter(Boolean);
  if (list?.length) return [...new Set(list)];

  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY?.trim()) keys.push(process.env.GEMINI_API_KEY.trim());
  if (process.env.GEMINI_API_KEY_SECONDARY?.trim()) keys.push(process.env.GEMINI_API_KEY_SECONDARY.trim());
  if (process.env.GEMINI_API_KEY_2?.trim()) keys.push(process.env.GEMINI_API_KEY_2.trim());
  if (process.env.GEMINI_API_KEY_BACKUP?.trim()) keys.push(process.env.GEMINI_API_KEY_BACKUP.trim());
  return [...new Set(keys)];
}

function models(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  return [...new Set([primary, ...FALLBACK_MODELS])];
}

function rotateKeys(keys: string[]) {
  if (keys.length <= 1) return keys;
  const i = keyIndex++ % keys.length;
  return [...keys.slice(i), ...keys.slice(0, i)];
}

function clearExpiredCooldowns() {
  const now = Date.now();
  for (const [key, until] of keyCooldowns) {
    if (now > until) keyCooldowns.delete(key);
  }
}

function getAvailableKeys(keys: string[]): string[] {
  clearExpiredCooldowns();
  const now = Date.now();
  const rotated = rotateKeys(keys);
  return rotated.filter((k) => {
    const cooldownUntil = keyCooldowns.get(k) || 0;
    return now > cooldownUntil;
  });
}

function timeUntilNextAvailable(keys: string[]): number {
  const now = Date.now();
  let minWait = Infinity;
  for (const k of keys) {
    const until = keyCooldowns.get(k) || 0;
    if (until > now) {
      minWait = Math.min(minWait, until - now);
    } else {
      return 0;
    }
  }
  return minWait === Infinity ? 0 : minWait;
}

function cooldownKey(key: string, retryAfterSeconds?: number | null) {
  const cooldownMs = retryAfterSeconds
    ? retryAfterSeconds * 1000
    : DEFAULT_COOLDOWN_MS;
  // Add small jitter (0-1s) to prevent thundering herd when multiple requests wake up
  const jitter = Math.floor(Math.random() * 1000);
  keyCooldowns.set(key, Date.now() + cooldownMs + jitter);
}

async function enforceKeySpacing(key: string) {
  const lastUsed = keyLastUsed.get(key) || 0;
  const now = Date.now();
  const timeSinceLastUse = now - lastUsed;
  if (timeSinceLastUse < MIN_KEY_SPACING_MS) {
    const wait = MIN_KEY_SPACING_MS - timeSinceLastUse;
    await sleep(wait);
  }
  keyLastUsed.set(key, Date.now());
}

function buildRateLimitError(keys: string[]): Error {
  const now = Date.now();
  const statuses = keys.map((k) => {
    const until = keyCooldowns.get(k) || 0;
    if (until > now) {
      const remaining = Math.ceil((until - now) / 1000);
      return `• Key ...${k.slice(-6)}: ${remaining}s remaining`;
    }
    return `• Key ...${k.slice(-6)}: available`;
  });
  return new Error(
    `AI rate limit hit on all ${keys.length} key(s).\n${statuses.join("\n")}\n\n` +
    `Free-tier Gemini allows ~15 requests/minute per key.\n` +
    `Add more keys via GEMINI_API_KEYS (comma-separated) or wait for cooldown.`
  );
}

export async function callGemini(
  system: string,
  user: string,
  json = false,
  temperature = 0.5,
  customApiKey?: string,
): Promise<string> {
  const keys = apiKeys(customApiKey);
  if (!keys.length) throw new Error("GEMINI_API_KEY not configured");

  console.log(`[Gemini] Request starting with ${keys.length} key(s)`);

  let lastError: Error | null = null;

  modelLoop: for (const model of models()) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const availableKeys = getAvailableKeys(keys);

      if (availableKeys.length === 0) {
        const waitNeeded = timeUntilNextAvailable(keys);
        if (waitNeeded > 0 && waitNeeded <= MAX_WAIT_FOR_COOLDOWN_MS && attempt < MAX_ATTEMPTS - 1) {
          const waitMs = waitNeeded + 500;
          console.warn(`[Gemini] All ${keys.length} keys in cooldown. Patiently waiting ${Math.round(waitMs / 1000)}s for next key...`);
          await sleep(waitMs);
          continue;
        }
        lastError = buildRateLimitError(keys);
        if (waitNeeded > MAX_WAIT_FOR_COOLDOWN_MS) {
          throw lastError;
        }
        continue;
      }

      for (const key of availableKeys) {
        await enforceKeySpacing(key);

        console.log(`[Gemini] model=${model} key=...${key.slice(-6)} attempt=${attempt + 1}/${MAX_ATTEMPTS}`);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: user }] }],
              generationConfig: json
                ? { responseMimeType: "application/json", temperature }
                : { temperature },
            }),
          },
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text.trim()) {
            console.log(`[Gemini] Success model=${model} key=...${key.slice(-6)}`);
            return json ? cleanJsonResponse(text) : text;
          }
          lastError = new Error("AI returned an empty response. Please try again.");
          continue;
        }

        const body = await res.text().catch(() => "");

        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const retryAfterSec = retryAfter ? parseInt(retryAfter, 10) : null;
          cooldownKey(key, retryAfterSec);
          console.warn(`[Gemini] Key ...${key.slice(-6)} hit 429. Cooldown ${retryAfterSec || DEFAULT_COOLDOWN_MS / 1000}s.`);
          lastError = buildRateLimitError(keys);
        } else if (res.status === 503) {
          lastError = new Error("AI servers are busy. Retrying automatically…");
        } else if (res.status === 404) {
          console.warn(`[Gemini] Model ${model} not found (404). Trying next model...`);
          continue modelLoop;
        } else {
          lastError = new Error(`Gemini error ${res.status}: ${body.slice(0, 120)}`);
        }

        if (!RETRYABLE.has(res.status)) throw lastError;
      }

      if (attempt < MAX_ATTEMPTS - 1) {
        const waitMs = Math.min(3000, BASE_DELAY_MS * 2 ** attempt + Math.random() * 500);
        console.warn(`[Gemini] Round ${attempt + 1}/${MAX_ATTEMPTS} failed. Waiting ${Math.round(waitMs / 1000)}s...`);
        await sleep(waitMs);
      }
    }
  }

  console.error(`[Gemini] Exhausted. Last error: ${lastError?.message}`);
  throw lastError ?? new Error("AI unavailable. Wait a minute and try again.");
}