import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { YoutubeTranscript } from "youtube-transcript";
import { callGemini } from "./gemini";
import { extractVideoId } from "./youtube";

// ─── YouTube Data API v3 Search ────────────────────────────────────────────────

export type YouTubeSearchResult = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
  description: string;
};

export const searchYouTube = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string }) =>
    z.object({ query: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "YouTube API key not configured on server." };
    }

    try {
      // Stricter classification of the search query using Gemini to enforce study/educational content only
      const classificationSys =
        "You are an educational search guard. Your job is to analyze the user's search query and decide if it is study-related (e.g. learning programming, math, science, history, coding tutorials, academic topics, language courses, technical explanations) vs non-educational entertainment (e.g. music videos, pop songs, gameplay, movie clips/trailers, funny cat videos, vlog diaries, celebrity gossip). " +
        "You MUST respond with a JSON object containing:\n" +
        "{\"isEducational\": boolean, \"reason\": \"A brief explanation of why this query is or isn't allowed. Keep it friendly but clear.\"}\n" +
        "If it is about general education or academic topics, set isEducational to true. If it is about purely entertainment, set to false.";

      const classificationUser = `Search Query: "${data.query}"`;
      
      const classificationRaw = await callGemini(classificationSys, classificationUser, true, 0.1).catch((err) => {
        console.warn("[searchYouTube] Classification failed, falling back to permissive mode:", err);
        return null;
      });

      if (classificationRaw) {
        try {
          const parsed = JSON.parse(classificationRaw);
          if (parsed.isEducational === false) {
            return { 
              ok: false as const, 
              error: parsed.reason || "Please enter a study-related search term. Certify is strictly designed for educational content." 
            };
          }
        } catch (e) {
          console.warn("[searchYouTube] Failed to parse classification JSON:", e);
        }
      }

      // 1. Query Augmentation: Append keywords to nudge the index to return high-quality educational videos
      const studyKeywords = "(tutorial OR course OR lecture OR learn OR study OR explained OR academy OR class OR crash course OR training)";
      const augmentedQuery = `${data.query} ${studyKeywords}`;

      const params = new URLSearchParams({
        part: "snippet",
        q: augmentedQuery,
        type: "video",
        maxResults: "12",
        order: "relevance",
        safeSearch: "strict", // Strict content filtering
        key: apiKey,
      });

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[YouTube Search] API error ${res.status}: ${body.slice(0, 200)}`);
        if (res.status === 403) {
          return { ok: false as const, error: "YouTube API quota exceeded for today. Try again tomorrow or use a URL instead." };
        }
        return { ok: false as const, error: `YouTube search failed (${res.status}).` };
      }

      const json = await res.json();
      
      // Blocklist of non-educational/entertainment phrases in titles
      const entertainmentBlocklist = [
        "official trailer",
        "teaser",
        "official music video",
        "official audio",
        "movie clip",
        "full movie",
        "funny moments",
        "compilation video",
        "music cover",
        "gameplay clip",
      ];

      const results: YouTubeSearchResult[] = (json.items || [])
        .map((item: any) => ({
          videoId: item.id?.videoId ?? "",
          title: decodeHtmlEntities(item.snippet?.title ?? ""),
          channel: decodeHtmlEntities(item.snippet?.channelTitle ?? ""),
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
          publishedAt: item.snippet?.publishedAt ?? "",
          description: decodeHtmlEntities(item.snippet?.description ?? ""),
        }))
        // Filter out non-video entries and items matching the entertainment blocklist
        .filter((r: YouTubeSearchResult) => {
          if (!r.videoId) return false;
          const lowerTitle = r.title.toLowerCase();
          return !entertainmentBlocklist.some((phrase) => lowerTitle.includes(phrase));
        });

      const filteredResults = await filterShorts(results, apiKey);
      return { ok: true as const, results: filteredResults };
    } catch (err) {
      console.error("[YouTube Search] Error:", err);
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "YouTube search failed.",
      };
    }
  });

export const getSuggestedVideos = createServerFn({ method: "POST" })
  .inputValidator((d: { category?: string } | undefined) =>
    z.object({ category: z.string().optional() }).optional().parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "YouTube API key not configured on server." };
    }

    try {
      // 1. Try to fetch trending educational videos (category 27) which only costs 1 quota unit
      const params = new URLSearchParams({
        part: "snippet",
        chart: "mostPopular",
        videoCategoryId: "27", // Education category ID
        maxResults: "6",
        key: apiKey,
      });

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
      );

      let items = [];
      if (res.ok) {
        const json = await res.json();
        items = json.items || [];
      }

      // 2. If mostPopular list is empty (e.g. not supported in region or quota issue), fall back to curated high-quality educational queries
      if (items.length === 0) {
        const curatedTopics = [
          "freecodecamp computer science",
          "javascript tutorial for beginners",
          "python crash course program",
          "mit opencourseware machine learning",
          "crash course physics explanation",
          "khan academy biology topic",
        ];
        
        // Pick a random study query to keep suggestions fresh
        const selectedQuery = curatedTopics[Math.floor(Math.random() * curatedTopics.length)];
        
        const fallbackParams = new URLSearchParams({
          part: "snippet",
          q: selectedQuery,
          type: "video",
          maxResults: "6",
          order: "relevance",
          safeSearch: "strict",
          key: apiKey,
        });

        const fallbackRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?${fallbackParams.toString()}`,
        );

        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          items = fallbackJson.items || [];
        }
      }

      const results: YouTubeSearchResult[] = items
        .map((item: any) => {
          // videos.list returns item.id as string; search.list returns item.id.videoId
          const videoId = item.id?.videoId || (typeof item.id === "string" ? item.id : "");
          return {
            videoId,
            title: decodeHtmlEntities(item.snippet?.title ?? ""),
            channel: decodeHtmlEntities(item.snippet?.channelTitle ?? ""),
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
            publishedAt: item.snippet?.publishedAt ?? "",
            description: decodeHtmlEntities(item.snippet?.description ?? ""),
          };
        })
        .filter((r: YouTubeSearchResult) => r.videoId);

      const filteredResults = await filterShorts(results, apiKey);
      return { ok: true as const, results: filteredResults };
    } catch (err) {
      console.error("[YouTube Suggestions] Error:", err);
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "YouTube suggestions failed.",
      };
    }
  });

/** Decode HTML entities from YouTube API responses (e.g. &amp; → &) */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Helper to parse ISO 8601 duration string into seconds */
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Double-layer YouTube Shorts filter */
async function filterShorts(results: YouTubeSearchResult[], apiKey: string): Promise<YouTubeSearchResult[]> {
  if (results.length === 0) return results;
  
  // 1. Text-based filtering first (fast & cost-free)
  let candidates = results.filter(r => {
    const title = r.title.toLowerCase();
    const desc = r.description.toLowerCase();
    if (title.includes("#shorts") || title.includes("#short") || (title.includes("shorts") && title.includes("#"))) return false;
    if (desc.includes("#shorts") || desc.includes("#short")) return false;
    return true;
  });

  if (candidates.length === 0) return [];

  // 2. Fetch video durations to filter out videos < 60s
  try {
    const videoIds = candidates.map(c => c.videoId).join(",");
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
    );
    if (res.ok) {
      const json = await res.json();
      const durationMap: Record<string, number> = {};
      for (const item of (json.items || [])) {
        if (item.contentDetails?.duration) {
          durationMap[item.id] = parseISO8601Duration(item.contentDetails.duration);
        }
      }
      // Filter out any video that is < 60 seconds
      candidates = candidates.filter(c => {
        const duration = durationMap[c.videoId];
        if (duration !== undefined && duration < 60) {
          console.log(`[YouTube Filter] Filtering out Short video: "${c.title}" (duration: ${duration}s)`);
          return false;
        }
        return true;
      });
    }
  } catch (err) {
    console.warn("[filterShorts] Failed to fetch contentDetails for duration filtering:", err);
  }

  return candidates;
}

async function fetchOEmbed(videoId: string) {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!r.ok) return null;
    const d = await r.json();
    return {
      title: d.title as string,
      author: d.author_name as string,
      thumbnail: d.thumbnail_url as string,
    };
  } catch {
    return null;
  }
}

export const extractVideo = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) =>
    z.object({ url: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const id = extractVideoId(data.url);
    if (!id)
      return {
        ok: false as const,
        error: "Could not extract a valid YouTube video ID from this URL.",
      };
    const meta = await fetchOEmbed(id);
    return { ok: true as const, videoId: id, meta };
  });

export const fetchTranscript = createServerFn({ method: "POST" })
  .inputValidator((d: { videoId: string; customApiKey?: string }) =>
    z.object({
      videoId: z.string().regex(/^[0-9A-Za-z_-]{11}$/),
      customApiKey: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const items = await YoutubeTranscript.fetchTranscript(data.videoId);
      if (!items?.length) {
        return { ok: false as const, error: "Transcript unavailable for this video." };
      }
      
      // Accumulate segments up to a safe character limit (e.g. 120,000 characters) to support long videos
      const maxChars = 120000;
      let currentLength = 0;
      const limitedItems = [];
      for (const item of items) {
        const itemLen = item.text.length + 1; // +1 for space joiner
        if (currentLength + itemLen > maxChars) {
          break;
        }
        limitedItems.push(item);
        currentLength += itemLen;
      }
      if (limitedItems.length === 0 && items.length > 0) {
        limitedItems.push(items[0]);
      }

      const text = limitedItems.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim();

      // Coalesce segments into larger blocks (e.g., merging adjacent segments up to ~30 seconds duration)
      // This reduces DOM elements from thousands to under 200, solving browser-freezing bottlenecks.
      const coalescedSegments: { text: string; offset: number; duration: number }[] = [];
      const CHUNK_MAX_DURATION_MS = 30000; // 30 seconds
      let currentChunk: { text: string[]; offset: number; duration: number } | null = null;

      for (const item of limitedItems) {
        if (!currentChunk) {
          currentChunk = {
            text: [item.text],
            offset: item.offset,
            duration: item.duration,
          };
        } else {
          const elapsed = (item.offset + item.duration) - currentChunk.offset;
          if (elapsed > CHUNK_MAX_DURATION_MS) {
            coalescedSegments.push({
              text: currentChunk.text.join(" ").replace(/\s+/g, " ").trim(),
              offset: currentChunk.offset,
              duration: currentChunk.duration,
            });
            currentChunk = {
              text: [item.text],
              offset: item.offset,
              duration: item.duration,
            };
          } else {
            currentChunk.text.push(item.text);
            currentChunk.duration = (item.offset + item.duration) - currentChunk.offset;
          }
        }
      }

      if (currentChunk) {
        coalescedSegments.push({
          text: currentChunk.text.join(" ").replace(/\s+/g, " ").trim(),
          offset: currentChunk.offset,
          duration: currentChunk.duration,
        });
      }

      return { ok: true as const, transcript: text, segments: coalescedSegments };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transcript unavailable for this video.";
      return {
        ok: false as const,
        error: msg.includes("disabled")
          ? "Captions are disabled on this video."
          : "Transcript unavailable for this video.",
      };
    }
  });

export const summarize = createServerFn({ method: "POST" })
  .inputValidator((d: { transcript: string; customApiKey?: string }) =>
    z.object({
      transcript: z.string().min(20).max(200000),
      customApiKey: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sys =
      "You are a precise educator. Summarize transcripts into structured JSON. Output only valid JSON.";
    const usr = `Summarize this YouTube transcript. Return JSON with shape:
{"summary": string (3-4 sentence overview), "keyPoints": string[] (5-8 punchy bullets), "topics": string[] (3-6 short topic tags)}

Transcript:
${data.transcript}`;
    try {
      const raw = await callGemini(sys, usr, true, 0.5, data.customApiKey);
      const j = JSON.parse(raw);
      return {
        summary: String(j.summary ?? ""),
        keyPoints: Array.isArray(j.keyPoints) ? j.keyPoints.map(String) : [],
        topics: Array.isArray(j.topics) ? j.topics.map(String) : [],
      };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "AI returned malformed summary.",
      };
    }
  });

const Difficulty = z.enum(["beginner", "intermediate", "expert"]);

export const runCode = createServerFn({ method: "POST" })
  .inputValidator((d: { language: string; code: string }) =>
    z.object({ language: z.string(), code: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    let lang = data.language.toLowerCase().trim();
    if (lang === "c++" || lang === "cpp") lang = "cpp";
    else if (lang === "js" || lang === "javascript") lang = "javascript";
    else if (lang === "ts" || lang === "typescript") lang = "typescript";
    else if (lang === "py" || lang === "python") lang = "python";
    else if (lang === "cs" || lang === "csharp" || lang === "c#") lang = "csharp";
    else if (lang === "rb" || lang === "ruby") lang = "ruby";

    const langIdMap: Record<string, number> = {
      python: 100,      // Python (3.12.5)
      javascript: 102,  // JavaScript (Node.js 22.08.0)
      typescript: 101,  // TypeScript (5.6.2)
      cpp: 105,         // C++ (GCC 14.1.0)
      c: 103,           // C (GCC 14.1.0)
      java: 91,         // Java (JDK 17.0.6)
      go: 107,          // Go (1.23.5)
      rust: 108,        // Rust (1.85.0)
      ruby: 72,         // Ruby (2.7.0)
      php: 98,          // PHP (8.3.11)
      csharp: 51,       // C# (Mono 6.6.0.161)
    };

    const langId = langIdMap[lang] || 100; // default to Python 3.12.5 if unknown

    const pistonApiKey = process.env.PISTON_API_KEY;
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    try {
      if (pistonApiKey) {
        const extMap: Record<string, string> = {
          python: "py",
          javascript: "js",
          typescript: "ts",
          cpp: "cpp",
          c: "c",
          java: "java",
          go: "go",
          rust: "rs",
          ruby: "rb",
          php: "php",
          csharp: "cs",
        };
        const ext = extMap[lang] || "txt";
        const res = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": pistonApiKey,
          },
          body: JSON.stringify({
            language: lang,
            version: "*",
            files: [
              {
                name: `main.${ext}`,
                content: data.code,
              },
            ],
          }),
        });

        if (!res.ok) {
          return { ok: false as const, error: `Piston execution returned status ${res.status}` };
        }

        const runResult = await res.json();
        return {
          ok: true as const,
          stdout: runResult.run?.stdout || "",
          stderr: runResult.run?.stderr || "",
          output: runResult.run?.output || "",
          code: runResult.run?.code ?? 0,
          signal: null,
        };
      }

      // Otherwise Judge0
      let url = "https://ce.judge0.com/submissions?wait=true";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      };

      if (rapidApiKey) {
        url = "https://judge0-ce.p.rapidapi.com/submissions?wait=true";
        headers["x-rapidapi-key"] = rapidApiKey;
        headers["x-rapidapi-host"] = "judge0-ce.p.rapidapi.com";
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          source_code: data.code,
          language_id: langId,
        }),
      });

      if (!res.ok) {
        return { ok: false as const, error: `Judge0 execution returned status ${res.status}` };
      }

      const runResult = await res.json();

      const stdout = runResult.stdout || "";
      const compileErr = runResult.compile_output || "";
      const runtimeErr = runResult.stderr || "";
      const stderr = (compileErr + "\n" + runtimeErr).trim();
      const output = stdout || stderr || runResult.status?.description || "";
      const statusId = runResult.status?.id ?? 3;
      const exitCode = statusId === 3 ? 0 : statusId;

      return {
        ok: true as const,
        stdout,
        stderr,
        output,
        code: exitCode,
        signal: null,
      };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Failed to execute code on compiler API",
      };
    }
  });

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { transcript: string; difficulty: "beginner" | "intermediate" | "expert"; customApiKey?: string }) =>
      z
        .object({
          transcript: z.string().min(20).max(200000),
          difficulty: Difficulty,
          customApiKey: z.string().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const sys = `You are a precise computer science educator and content curator.
Analyze the YouTube transcript and difficulty level to:
1. Determine if the video content is related to educational study (e.g. tutorials, academic lectures, skill development, explainers, etc.) vs entertainment/vlogs/music/general noise.
2. If the video is NOT educational study, return JSON with:
   {"isStudy": false, "studyClassificationReason": "Provide a friendly, context-specific explanation of why this video is not educational and what kind of videos are supported."}
3. If it IS educational study:
   a. Check if the video is related to software programming/coding (e.g. learning Python, Javascript, C++, Java, Rust, SQL, HTML/CSS, etc.).
   b. Check if the requested difficulty is 'expert'.
   c. If BOTH are true (expert AND coding video), generate a hands-on Coding Challenge instead of multiple choice.
      Return a JSON with:
      {
        "isStudy": true,
        "isCoding": true,
        "language": "python" | "javascript" | "cpp" | "java" | "rust" | "go", // detected programming language
        "codingChallenge": {
          "title": "A concise title for the programming task (e.g. 'Reverse a String' or 'Factorial')",
          "description": "Markdown instructions. Explain the problem, input format, output format, constraints, and provide 2 examples with inputs and expected outputs.",
          "starterCode": "starter template code (e.g. function signature or starter code with comments)",
          "testRunnerCode": "A complete script that we will APPEND to the user's code. It must execute the user's code against 3+ comprehensive tests (including edge cases) and print '__SUCCESS__' if all tests pass, or '__FAILED__: <reason>' if any fail. Wrap in try-catch to print '__FAILED__: <exception>'. Make sure to not reference any extra files, and execute everything in standard output.",
          "testCases": [
            {"input": "Example input description", "expected": "Expected output description", "explanation": "Why this output is expected"}
          ]
        }
      }
   d. Otherwise (not coding video, or beginner/intermediate level), generate a standard multiple-choice quiz with exactly 8 questions.
      Return a JSON with:
      {
        "isStudy": true,
        "isCoding": false,
        "questions": [
          {"question": "string", "options": ["string", "string", "string", "string"], "answerIndex": number(0-3), "explanation": "string"}
        ]
      }
`;
    const usr = `Generate a ${data.difficulty}-level quiz or coding challenge based on this transcript.
Difficulty requested: ${data.difficulty}

Transcript:
${data.transcript}`;

    try {
      const raw = await callGemini(sys, usr, true, 0.5, data.customApiKey);
      const j = JSON.parse(raw);
      if (j.isStudy === false) {
        return {
          isStudy: false,
          studyClassificationReason: String(j.studyClassificationReason || "This video does not contain educational study content."),
        };
      }

      if (j.isCoding && j.codingChallenge) {
        return {
          isStudy: true,
          isCoding: true,
          language: String(j.language || "python"),
          codingChallenge: {
            title: String(j.codingChallenge.title ?? ""),
            description: String(j.codingChallenge.description ?? ""),
            starterCode: String(j.codingChallenge.starterCode ?? ""),
            testRunnerCode: String(j.codingChallenge.testRunnerCode ?? ""),
            testCases: Array.isArray(j.codingChallenge.testCases)
              ? j.codingChallenge.testCases.map((tc: any) => ({
                input: String(tc.input ?? ""),
                expected: String(tc.expected ?? ""),
                explanation: String(tc.explanation ?? ""),
              }))
              : [],
          },
        };
      }

      // Fallback or MCQ
      const qs = (j.questions ?? [])
        .map((q: any) => ({
          question: String(q.question ?? ""),
          options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
          answerIndex: Math.max(0, Math.min(3, Number(q.answerIndex ?? 0))),
          explanation: String(q.explanation ?? ""),
        }))
        .filter((q: any) => q.question && q.options.length === 4);

      if (!qs.length) throw new Error("empty");
      return { isStudy: true, isCoding: false, questions: qs };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "AI returned malformed response.",
      };
    }
  });

export const testGeminiConnection = createServerFn({ method: "POST" })
  .inputValidator((d: { customApiKey: string }) =>
    z.object({ customApiKey: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    console.log(`[testGeminiConnection] Server fn invoked to test custom API key connection...`);
    try {
      const response = await callGemini(
        "You are a connection tester. Reply with 'OK'.",
        "Respond with exactly 'OK'.",
        false,
        0.5,
        data.customApiKey,
      );

      if (response.includes("OK") || response.length > 0) {
        return { ok: true as const, message: "Connection successful! Your API key is fully working." };
      }
      return { ok: false as const, error: "Unexpected response from Gemini." };
    } catch (e: any) {
      console.error(`[testGeminiConnection] Connection test failed:`, e);
      return { ok: false as const, error: e.message || "Failed to connect to Gemini." };
    }
  });
