import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  extractVideo,
  fetchTranscript,
  summarize,
  generateQuiz,
  testGeminiConnection,
  searchYouTube,
  getSuggestedVideos,
  runCode,
} from "@/lib/video.functions";
import type { YouTubeSearchResult } from "@/lib/video.functions";
import { saveCertificate } from "@/lib/certificates.functions";
import { Certificate } from "@/components/Certificate";
import { useAuth } from "@/hooks/use-auth";
import { CodePlayground } from "@/components/CodePlayground";
import { LEETCODE_QUESTIONS } from "@/lib/leetcode.data";
import {
  getLeetCodeProblems,
  getLeetCodeProblemDetails,
  recordSubmissionSuccess,
  getLeetCodeLeaderboard,
  bootstrapLeetCodeDatabase
} from "@/lib/leetcode.db";
import {
  AlertTriangle, Instagram, Linkedin, Github, Search, Link2, Loader2, ArrowLeft,
  Flame, Trophy, Calendar, Zap, CheckCircle2, XCircle, Terminal, BookOpen, User2,
  ChevronLeft, ChevronRight, Play
} from "lucide-react";

// Markdown helper to parse bold text (**text**) and code blocks (`code`) in questions/options
function parseInlineMarkdown(text: string) {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const rawParts = text.split(regex);

  return rawParts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-[#f59e0b] dark:text-[#fbbf24]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="bg-slate-900/90 border border-cyan-400/30 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-[11px] select-all">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Text highlighting helper for search queries in transcripts
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-[#fbbf24] text-black font-semibold rounded px-0.5 select-all">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export const Route = createFileRoute("/")({
  component: App,
});

type Difficulty = "beginner" | "intermediate" | "expert";
type Step = "input" | "video" | "quiz" | "result" | "certificate" | "leetcode";
type Question = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

type CodingChallengeState = {
  title: string;
  description: string;
  starterCode: string;
  testRunnerCode: string;
  testCases: { input: string; expected: string; explanation: string }[];
  language: string;
} | null;

function App() {
  const extractFn = useServerFn(extractVideo);
  const transcriptFn = useServerFn(fetchTranscript);
  const summarizeFn = useServerFn(summarize);
  const quizFn = useServerFn(generateQuiz);
  const saveCertFn = useServerFn(saveCertificate);
  const searchFn = useServerFn(searchYouTube);
  const suggestedFn = useServerFn(getSuggestedVideos);
  const runCodeFn = useServerFn(runCode);
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();

  const getProblemsFn = useServerFn(getLeetCodeProblems);
  const getProblemDetailsFn = useServerFn(getLeetCodeProblemDetails);
  const recordSubmissionFn = useServerFn(recordSubmissionSuccess);
  const getLeaderboardFn = useServerFn(getLeetCodeLeaderboard);
  const bootstrapDbFn = useServerFn(bootstrapLeetCodeDatabase);

  const [step, setStep] = useState<Step>("input");
  const [showApp, setShowApp] = useState(false);
  const [zoomState, setZoomState] = useState<'idle' | 'zooming' | 'zooming-out' | 'completed'>('idle');
  const [homeView, setHomeView] = useState<'hero' | 'about' | 'reach'>('hero');

  function triggerBeginJourney() {
    if (zoomState !== 'idle') return;
    setZoomState('zooming');
    setTimeout(() => {
      setShowApp(true);
      setZoomState('completed');
    }, 1600);
  }

  function goHome(view: 'hero' | 'about' | 'reach' = 'hero') {
    if (zoomState === 'zooming-out') return;

    if (view === 'about' || view === 'reach') {
      // Transition instantly without reverse zooming animations
      setHomeView(view);
      setShowApp(false);
      setStep("input");
      setZoomState('idle');
      return;
    }

    setZoomState('zooming-out');
    setHomeView(view);
    // After a short delay, switch to homepage video (still zoomed in)
    setTimeout(() => {
      setShowApp(false);
      setStep("input");
    }, 600);
    // After the full reverse zoom completes, reset to idle
    setTimeout(() => {
      setZoomState('idle');
    }, 2200);
  }

  const [customApiKey, setCustomApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("custom_gemini_api_key") || "";
    }
    return "";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("custom_gemini_api_key", customApiKey);
    }
  }, [customApiKey]);

  const testKeyFn = useServerFn(testGeminiConnection);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingKey, setTestingKey] = useState(false);

  async function handleTestKey() {
    if (!customApiKey.trim()) {
      toast.error("Please paste an API key first.");
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await testKeyFn({ data: { customApiKey: customApiKey.trim() } });
      if (res.ok) {
        setTestResult({ ok: true, message: res.message });
        toast.success("API Key is working!");
      } else {
        setTestResult({ ok: false, message: res.error });
        toast.error(res.error);
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || "Test failed" });
      toast.error(err.message || "Test failed");
    } finally {
      setTestingKey(false);
    }
  }

  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [meta, setMeta] = useState<{ title: string; author: string; thumbnail?: string } | null>(null);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<{ summary: string; keyPoints: string[]; topics: string[] } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<"" | "extract" | "summary" | "quiz" | "save">("");
  const [certId, setCertId] = useState("");

  // YouTube Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"search" | "url">("search");
  const [suggestedVideos, setSuggestedVideos] = useState<YouTubeSearchResult[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  // LeetCode DSA state
  const [activeLeetCodeQuestion, setActiveLeetCodeQuestion] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"python" | "javascript" | "cpp">("python");
  const [userCode, setUserCode] = useState("");
  const [runLoading, setRunLoading] = useState(false);
  const [compilerOutput, setCompilerOutput] = useState<{ status: "idle" | "running" | "success" | "failed"; stdout: string; compileError?: string } | null>(null);
  const [lastCertStep, setLastCertStep] = useState<Step>("input");
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [leetcodeQuestionsLoading, setLeetcodeQuestionsLoading] = useState(false);

  const [leetcodeSolved, setLeetcodeSolved] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("leetcode_solved_ids");
      return saved ? JSON.parse(saved) : ["20"]; // start with Valid Parentheses solved as an example
    }
    return ["20"];
  });

  const [leetcodeSolvedDates, setLeetcodeSolvedDates] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("leetcode_solved_dates");
      // Pre-fill with a few days ago to show an active streak
      const todayStr = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split("T")[0];
      return saved ? JSON.parse(saved) : [twoDaysAgo, yesterday];
    }
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split("T")[0];
    return [twoDaysAgo, yesterday];
  });

  // Calculate current streak
  const calculateStreak = (dates: string[]) => {
    if (!dates.length) return 0;
    const sorted = [...new Set(dates)].map(d => {
      const parts = d.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
    }).sort((a, b) => b - a); // sort descending

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayMs = yesterday.getTime();

    // Check if the most recent solved date is either today or yesterday
    if (sorted[0] !== todayMs && sorted[0] !== yesterdayMs) {
      return 0; // streak broken
    }

    let currentExpectedMs = sorted[0];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] === currentExpectedMs) {
        streak++;
        // Expected next date in the sequence (1 day earlier)
        currentExpectedMs -= 86400000;
      } else if (sorted[i] < currentExpectedMs) {
        break; // gap in the streak
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak(leetcodeSolvedDates);

  // Sync state to local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("leetcode_solved_ids", JSON.stringify(leetcodeSolved));
    }
  }, [leetcodeSolved]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("leetcode_solved_dates", JSON.stringify(leetcodeSolvedDates));
    }
  }, [leetcodeSolvedDates]);

  useEffect(() => {
    if (step !== "leetcode") {
      setLastCertStep(step);
    }
  }, [step]);

  useEffect(() => {
    if (activeLeetCodeQuestion) {
      setUserCode(activeLeetCodeQuestion.starterCode[selectedLanguage] || "");
      setCompilerOutput(null);
    }
  }, [activeLeetCodeQuestion, selectedLanguage]);

  // Initial load: Fetch problems list and leaderboard rankings from database!
  useEffect(() => {
    if (showApp && step === "leetcode") {
      void loadProblemsAndLeaderboard();
    }
  }, [showApp, step]);

  async function loadProblemsAndLeaderboard() {
    setLeetcodeQuestionsLoading(true);
    try {
      // Bootstraps (populates) database automatically if first-time load
      void bootstrapDbFn();

      const [probRes, leadRes] = await Promise.all([
        getProblemsFn(),
        getLeaderboardFn()
      ]);

      if (probRes.ok) {
        setQuestionsList(probRes.questions);
      }
      if (leadRes.ok) {
        // Tag active user matching their display name
        const userDisplayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Ishu (You)";
        const taggedLeaderboard = leadRes.leaderboard.map((member: any) => {
          const isMe = member.name.toLowerCase() === userDisplayName.toLowerCase() || member.name.toLowerCase().includes("you");
          return {
            ...member,
            isUser: isMe
          };
        });

        // Ensure active user is in the list
        const userSolvedCount = leetcodeSolved.length;
        const userPoints = userSolvedCount * 10 + currentStreak * 15;
        const hasMe = taggedLeaderboard.some((m: any) => m.isUser);

        if (!hasMe) {
          taggedLeaderboard.push({
            name: `${userDisplayName} (You)`,
            solved: userSolvedCount,
            streak: currentStreak,
            points: userPoints,
            isUser: true
          });
        } else {
          // Sync my points in the returned leaderboard
          taggedLeaderboard.forEach((member: any) => {
            if (member.isUser) {
              member.solved = userSolvedCount;
              member.streak = currentStreak;
              member.points = userPoints;
            }
          });
        }

        setLeaderboard(taggedLeaderboard.sort((a: any, b: any) => b.points - a.points));
      }
    } catch (err) {
      console.error("Failed to load leetcode records:", err);
    } finally {
      setLeetcodeQuestionsLoading(false);
    }
  }

  // Handles picking a question: Loads full templates dynamically from database with an AI Upgrader fallback!
  async function handleSelectQuestion(q: any) {
    setRunLoading(true);
    setActiveLeetCodeQuestion(null);
    try {
      const res = await getProblemDetailsFn({ data: { id: q.id } });
      if (res.ok) {
        setActiveLeetCodeQuestion(res.question);
      } else {
        toast.error("Failed to load problem workspace.");
      }
    } catch (err) {
      toast.error("Failed to load problem workspace.");
    } finally {
      setRunLoading(false);
    }
  }

  // Dynamic ranking leaderboard state
  const [leaderboard, setLeaderboard] = useState(() => {
    const defaultLeaderboard = [
      { name: "Shubham", solved: 4, streak: 25, points: 415, isUser: false },
      { name: "Ishu (You)", solved: 1, streak: 2, points: 40, isUser: true },
      { name: "Alice", solved: 3, streak: 12, points: 210, isUser: false },
      { name: "Bob", solved: 2, streak: 8, points: 140, isUser: false },
      { name: "Charlie", solved: 1, streak: 3, points: 55, isUser: false },
    ];

    const userSolvedCount = leetcodeSolved.length;
    const userPoints = userSolvedCount * 10 + currentStreak * 15;

    return defaultLeaderboard.map(member => {
      if (member.isUser) {
        return {
          ...member,
          solved: userSolvedCount,
          streak: currentStreak,
          points: userPoints,
        };
      }
      return member;
    }).sort((a, b) => b.points - a.points);
  });

  // Re-sort leaderboard dynamically when streak or solved items change
  useEffect(() => {
    const userSolvedCount = leetcodeSolved.length;
    const userPoints = userSolvedCount * 10 + currentStreak * 15;

    setLeaderboard(prev =>
      prev.map(member => {
        if (member.isUser) {
          return {
            ...member,
            solved: userSolvedCount,
            streak: currentStreak,
            points: userPoints,
          };
        }
        return member;
      }).sort((a, b) => b.points - a.points)
    );
  }, [leetcodeSolved, currentStreak]);

  // New Expert coding/educational validation states
  const [codingChallenge, setCodingChallenge] = useState<CodingChallengeState>(null);
  const [studyError, setStudyError] = useState<string>("");

  // Interactive synced transcript segments
  const [segments, setSegments] = useState<{ text: string; offset: number; duration: number }[]>([]);

  // YouTube player syncing state
  const [player, setPlayer] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const lastScrolledIdxRef = useRef<number>(-1);

  // Sync YouTube Player API
  useEffect(() => {
    if (!videoId || step !== "video") {
      setPlayer(null);
      setCurrentTime(0);
      lastScrolledIdxRef.current = -1;
      return;
    }

    let active = true;
    let ytPlayer: any = null;

    const buildPlayer = () => {
      if (!active) return;

      const container = document.getElementById("yt-player-container");
      if (!container) {
        setTimeout(buildPlayer, 100);
        return;
      }

      // Re-create the player div dynamically to handle iframe-replacement/destroy removal cleanups
      container.innerHTML = "";
      const playerDiv = document.createElement("div");
      playerDiv.id = "yt-player-frame";
      playerDiv.className = "w-full h-full";
      container.appendChild(playerDiv);

      try {
        ytPlayer = new (window as any).YT.Player("yt-player-frame", {
          height: "100%",
          width: "100%",
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              if (active) {
                setPlayer(event.target);
              }
            },
          },
        });
      } catch (err) {
        console.error("Error creating YT Player:", err);
      }
    };

    const loadScriptAndBuild = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        buildPlayer();
      } else {
        if (!document.getElementById("yt-iframe-api-script")) {
          const tag = document.createElement("script");
          tag.id = "yt-iframe-api-script";
          tag.src = "https://www.youtube.com/iframe_api";
          const firstScriptTag = document.getElementsByTagName("script")[0];
          if (firstScriptTag && firstScriptTag.parentNode) {
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
          } else {
            document.head.appendChild(tag);
          }
        }

        const pollInterval = setInterval(() => {
          if ((window as any).YT && (window as any).YT.Player) {
            clearInterval(pollInterval);
            buildPlayer();
          }
        }, 100);

        return () => clearInterval(pollInterval);
      }
    };

    loadScriptAndBuild();

    return () => {
      active = false;
      if (ytPlayer && typeof ytPlayer.destroy === "function") {
        try {
          ytPlayer.destroy();
        } catch (e) {
          console.warn("Error destroying YT player:", e);
        }
      }
    };
  }, [videoId, step]);

  // Poll current video playback time
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try {
        if (player.getPlayerState?.() === 1) { // 1 = PLAYING
          setCurrentTime(player.getCurrentTime() * 1000); // convert to ms
        }
      } catch (err) { }
    }, 250);
    return () => clearInterval(interval);
  }, [player]);

  useEffect(() => {
    if (user && !name) {
      const meta = user.user_metadata as { display_name?: string } | undefined;
      setName(meta?.display_name ?? user.email?.split("@")[0] ?? "");
    }
  }, [user, name]);


  async function runSummary(t = transcript, retryCount = 0) {
    setLoading("summary");
    try {
      const s = await summarizeFn({ data: { transcript: t, customApiKey } });
      if (s && "error" in s && s.error) {
        const errMsg = String(s.error);
        if (errMsg.toLowerCase().includes("rate limit") && retryCount < 3) {
          toast.info(`AI keys cooling down… auto-retrying summary in 15s (attempt ${retryCount + 2}/4)`);
          setTimeout(() => runSummary(t, retryCount + 1), 15000);
          return;
        }
        toast.error(errMsg);
        return;
      }
      setSummary(s as any);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Summary failed";
      if (msg.toLowerCase().includes("rate limit") && retryCount < 3) {
        toast.info(`AI keys cooling down… auto-retrying summary in 15s (attempt ${retryCount + 2}/4)`);
        setTimeout(() => runSummary(t, retryCount + 1), 15000);
        return;
      }
      toast.error(msg);
    } finally {
      setLoading("");
    }
  }

  async function runQuiz(retryCount = 0) {
    setLoading("quiz");
    setStudyError("");
    setCodingChallenge(null);
    try {
      const q = await quizFn({ data: { transcript, difficulty, customApiKey } });

      if (q && "error" in q && q.error) {
        const errMsg = String(q.error);
        if (errMsg.toLowerCase().includes("rate limit") && retryCount < 3) {
          toast.info(`AI keys cooling down… auto-retrying quiz in 15s (attempt ${retryCount + 2}/4)`);
          setLoading("");
          setTimeout(() => runQuiz(retryCount + 1), 15000);
          return;
        }
        toast.error(errMsg);
        return;
      }

      if (q.isStudy === false) {
        setStudyError(q.studyClassificationReason || "This video does not contain educational study content.");
        toast.error("Quiz unavailable: Not educational content");
        return;
      }

      if (q.isCoding && q.codingChallenge) {
        setCodingChallenge({
          ...q.codingChallenge,
          language: q.language || "python",
        });

        // Setup dummy question for grading integration
        setQuestions([
          {
            question: q.codingChallenge.title,
            options: ["Incomplete", "Complete"],
            answerIndex: 1,
            explanation: "Completed hands-on programming compiler challenge."
          }
        ]);
        setAnswers([-1]);
        setStep("quiz");
      } else {
        setCodingChallenge(null);
        setQuestions(q.questions || []);
        setAnswers(new Array((q.questions || []).length).fill(-1));
        setStep("quiz");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Quiz generation failed";
      if (msg.toLowerCase().includes("rate limit") && retryCount < 3) {
        toast.info(`AI keys cooling down… auto-retrying quiz in 15s (attempt ${retryCount + 2}/4)`);
        setLoading("");
        setTimeout(() => runQuiz(retryCount + 1), 15000);
        return;
      }
      toast.error(msg);
    } finally {
      setLoading("");
    }
  }


  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to start a certification.");
      nav({ to: "/auth" });
      return;
    }
    if (!url.trim()) {
      toast.error("Paste a YouTube URL first.");
      return;
    }
    setLoading("extract");
    try {
      const ex = await extractFn({ data: { url: url.trim() } });
      if (!ex.ok) {
        toast.error(ex.error);
        return;
      }
      setVideoId(ex.videoId);
      setMeta(ex.meta);
      const t = await transcriptFn({ data: { videoId: ex.videoId, customApiKey } });
      if (!t.ok) {
        console.log(`[Transcript Fallback] Captions unavailable: ${t.error}. Activating topic fallback.`);
        toast.info("Captions are unavailable. Activating AI topic fallback mode to generate your quiz!");

        const fallbackText = `Educational Video Subject: "${ex.meta?.title || "Untitled Video"}" by ${ex.meta?.author || "Unknown Creator"}. 
Please use your exhaustive knowledge on this topic/subject to explain its core concepts and generate questions.`;

        setTranscript(fallbackText);
        setSegments([
          {
            text: "Captions are unavailable for this video. You can still study the summary and take the quiz based on the video topic!",
            offset: 0,
            duration: 10000,
          }
        ]);
        setStep("video");
        void runSummary(fallbackText);
      } else {
        setTranscript(t.transcript);
        setSegments(t.segments || []);
        setStep("video");
        void runSummary(t.transcript);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading("");
    }
  }

  async function loadSuggestions() {
    setSuggestedLoading(true);
    try {
      const res = await suggestedFn();
      if (res.ok) {
        setSuggestedVideos(res.results);
      } else {
        console.error("[YouTube Suggestions] Server error:", res.error);
      }
    } catch (err) {
      console.error("[YouTube Suggestions] Load failed:", err);
    } finally {
      setSuggestedLoading(false);
    }
  }

  // Pre-load suggestions when search mode is active
  useEffect(() => {
    if (showApp && inputMode === "search" && suggestedVideos.length === 0) {
      void loadSuggestions();
    }
  }, [showApp, inputMode, suggestedVideos.length]);

  async function handleSearch(e?: React.FormEvent, queryOverride?: string) {
    if (e) e.preventDefault();
    const queryToSearch = (queryOverride !== undefined ? queryOverride : searchQuery).trim();
    if (!queryToSearch) {
      toast.error("Type a search query first.");
      return;
    }
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await searchFn({ data: { query: queryToSearch } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSearchResults(res.results);
      if (res.results.length === 0) {
        toast.info("No results found. Try a different search term.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSearchSelect(result: YouTubeSearchResult) {
    if (!user) {
      toast.error("Please sign in to start a certification.");
      nav({ to: "/auth" });
      return;
    }
    setLoading("extract");
    try {
      setVideoId(result.videoId);
      setMeta({ title: result.title, author: result.channel, thumbnail: result.thumbnail });
      const t = await transcriptFn({ data: { videoId: result.videoId, customApiKey } });
      if (!t.ok) {
        console.log(`[Transcript Fallback] Captions unavailable: ${t.error}. Activating topic fallback.`);
        toast.info("Captions are unavailable. Activating AI topic fallback mode to generate your quiz!");
        const fallbackText = `Educational Video Subject: "${result.title}" by ${result.channel}. \nPlease use your exhaustive knowledge on this topic/subject to explain its core concepts and generate questions.`;
        setTranscript(fallbackText);
        setSegments([{
          text: "Captions are unavailable for this video. You can still study the summary and take the quiz based on the video topic!",
          offset: 0,
          duration: 10000,
        }]);
        setStep("video");
        void runSummary(fallbackText);
      } else {
        setTranscript(t.transcript);
        setSegments(t.segments || []);
        setStep("video");
        void runSummary(t.transcript);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading("");
    }
  }

  async function handleRunCode() {
    if (!activeLeetCodeQuestion) return;
    setRunLoading(true);
    setCompilerOutput({ status: "running", stdout: "Compiling and running sample testcase on server compiler..." });

    try {
      // Append a single test run to user's code
      let testCode = "";
      const titleLower = activeLeetCodeQuestion.title.toLowerCase();

      if (selectedLanguage === "python") {
        testCode = `
try:
    sol = Solution()
    if "${titleLower}" == "two sum":
        print("Running: twoSum([2, 7, 11, 15], 9)")
        print("Output:", sol.twoSum([2, 7, 11, 15], 9))
    elif "${titleLower}" == "valid parentheses":
        print("Running: isValid(\\"()[]{}\\")")
        print("Output:", sol.isValid("()[]{}"))
    elif "${titleLower}" == "single element in a sorted array":
        print("Running: singleNonDuplicate([1, 1, 2, 3, 3, 4, 4, 8, 8])")
        print("Output:", sol.singleNonDuplicate([1, 1, 2, 3, 3, 4, 4, 8, 8]))
    elif "${titleLower}" == "coin change 2":
        print("Running: change(5, [1, 2, 5])")
        print("Output:", sol.change(5, [1, 2, 5]))
    elif "${titleLower}" == "reverse integer":
        print("Running: reverse(123)")
        print("Output:", sol.reverse(123))
    else:
        print("Compilation and class instantiation successful! Add your own custom test calls below to run more tests.")
except Exception as e:
    print("Execution Error:", e)
`;
      } else if (selectedLanguage === "javascript") {
        testCode = `
try {
    const sol = new Solution();
    if ("${titleLower}" == "two sum") {
        console.log("Running: twoSum([2, 7, 11, 15], 9)");
        console.log("Output:", sol.twoSum([2, 7, 11, 15], 9));
    } else if ("${titleLower}" == "valid parentheses") {
        console.log("Running: isValid(\\"()[]{}\\")");
        console.log("Output:", sol.isValid("()[]{}"));
    } else if ("${titleLower}" == "single element in a sorted array") {
        console.log("Running: singleNonDuplicate([1, 1, 2, 3, 3, 4, 4, 8, 8])");
        console.log("Output:", sol.singleNonDuplicate([1, 1, 2, 3, 3, 4, 4, 8, 8]));
    } else if ("${titleLower}" == "coin change 2") {
        console.log("Running: change(5, [1, 2, 5])");
        console.log("Output:", sol.change(5, [1, 2, 5]));
    } else if ("${titleLower}" == "reverse integer") {
        console.log("Running: reverse(123)");
        console.log("Output:", sol.reverse(123));
    } else {
        console.log("Compilation and class instantiation successful! Add your own custom test calls below to run more tests.");
    }
} catch (e) {
    console.log("Execution Error:", e.message);
}
`;
      } else if (selectedLanguage === "cpp") {
        testCode = `
#include <iostream>
int main() {
    Solution sol;
    if ("${titleLower}" == "two sum") {
        std::vector<int> nums = {2, 7, 11, 15};
        std::vector<int> res = sol.twoSum(nums, 9);
        std::cout << "Running: twoSum([2, 7, 11, 15], 9)" << std::endl;
        std::cout << "Output: [" << res[0] << ", " << res[1] << "]" << std::endl;
    } else if ("${titleLower}" == "valid parentheses") {
        std::cout << "Running: isValid(\\"()[]{}\\")" << std::endl;
        std::cout << "Output: " << (sol.isValid("()[]{}") ? "true" : "false") << std::endl;
    } else if ("${titleLower}" == "single element in a sorted array") {
        std::vector<int> nums = {1, 1, 2, 3, 3, 4, 4, 8, 8};
        std::cout << "Running: singleNonDuplicate([1, 1, 2, 3, 3, 4, 4, 8, 8])" << std::endl;
        std::cout << "Output: " << sol.singleNonDuplicate(nums) << std::endl;
    } else if ("${titleLower}" == "coin change 2") {
        std::vector<int> coins = {1, 2, 5};
        std::cout << "Running: change(5, [1, 2, 5])" << std::endl;
        std::cout << "Output: " << sol.change(5, coins) << std::endl;
    } else if ("${titleLower}" == "reverse integer") {
        std::cout << "Running: reverse(123)" << std::endl;
        std::cout << "Output: " << sol.reverse(123) << std::endl;
    } else {
        std::cout << "Compilation and class instantiation successful! Add main() logic to run more tests." << std::endl;
    }
    return 0;
}
`;
      }

      const combinedCode = userCode + "\n" + testCode;
      const res = await runCodeFn({ data: { language: selectedLanguage, code: combinedCode } });

      if (!res.ok) {
        setCompilerOutput({ status: "failed", stdout: "", compileError: res.error });
        toast.error("Execution failed.");
        return;
      }

      setCompilerOutput({ status: "success", stdout: res.output || res.stdout || "No output returned." });
      toast.success("Run completed!");
    } catch (err: any) {
      console.error(err);
      setCompilerOutput({ status: "failed", stdout: "", compileError: err.message || "Failed to execute." });
      toast.error("Execution failed.");
    } finally {
      setRunLoading(false);
    }
  }

  async function handleSubmitSolution() {
    if (!activeLeetCodeQuestion) return;
    setRunLoading(true);
    setCompilerOutput({ status: "running", stdout: "Compiling and running assertions on server compiler..." });

    try {
      const combinedCode = userCode + "\n" + activeLeetCodeQuestion.testRunner[selectedLanguage];
      const res = await runCodeFn({ data: { language: selectedLanguage, code: combinedCode } });

      if (!res.ok) {
        setCompilerOutput({ status: "failed", stdout: "", compileError: res.error });
        toast.error("Compilation failed.");
        return;
      }

      const outputText = res.output || res.stdout || "";

      if (outputText.includes("__SUCCESS__")) {
        setCompilerOutput({ status: "success", stdout: outputText.replace("__SUCCESS__", "").trim() || "All test cases passed." });
        toast.success("Accepted! All test cases passed successfully.");

        const qId = activeLeetCodeQuestion.id;

        // Sync solution success to database stats in real-time
        try {
          const res = await recordSubmissionFn({ data: { questionId: qId } });
          if (res && res.solvedQuestions) {
            setLeetcodeSolved(res.solvedQuestions);
            setLeetcodeSolvedDates(res.solvedDates);
            // Refresh leaderboard stats dynamically
            void getLeaderboardFn().then(leadRes => {
              if (leadRes.ok) {
                const userDisplayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Ishu (You)";
                const taggedLeaderboard = leadRes.leaderboard.map((member: any) => {
                  const isMe = member.name.toLowerCase() === userDisplayName.toLowerCase() || member.name.toLowerCase().includes("you");
                  return {
                    ...member,
                    isUser: isMe
                  };
                });
                const hasMe = taggedLeaderboard.some((m: any) => m.isUser);
                if (!hasMe) {
                  taggedLeaderboard.push({
                    name: `${userDisplayName} (You)`,
                    solved: res.solvedQuestions.length,
                    streak: res.streak,
                    points: res.points,
                    isUser: true
                  });
                } else {
                  taggedLeaderboard.forEach((member: any) => {
                    if (member.isUser) {
                      member.solved = res.solvedQuestions.length;
                      member.streak = res.streak;
                      member.points = res.points;
                    }
                  });
                }
                setLeaderboard(taggedLeaderboard.sort((a: any, b: any) => b.points - a.points));
              }
            });
          } else {
            // Local fallback
            if (!leetcodeSolved.includes(qId)) {
              setLeetcodeSolved(prev => [...prev, qId]);
            }
            const todayStr = new Date().toISOString().split("T")[0];
            if (!leetcodeSolvedDates.includes(todayStr)) {
              setLeetcodeSolvedDates(prev => [...prev, todayStr]);
            }
          }
        } catch (err) {
          // Local fallback
          if (!leetcodeSolved.includes(qId)) {
            setLeetcodeSolved(prev => [...prev, qId]);
          }
          const todayStr = new Date().toISOString().split("T")[0];
          if (!leetcodeSolvedDates.includes(todayStr)) {
            setLeetcodeSolvedDates(prev => [...prev, todayStr]);
          }
        }
      } else {
        const errorDetail = outputText.replace("__FAILED__:", "").trim() || res.stderr || "Wrong Answer: test case validation failed.";
        setCompilerOutput({
          status: "failed",
          stdout: res.stdout || "",
          compileError: errorDetail
        });
        toast.error("Wrong Answer.");
      }
    } catch (err: any) {
      console.error(err);
      setCompilerOutput({ status: "failed", stdout: "", compileError: err.message || "Failed to submit solution." });
      toast.error("Submission failed.");
    } finally {
      setRunLoading(false);
    }
  }

  async function handleClaim() {
    if (!name.trim()) {
      toast.error("Enter your name.");
      return;
    }
    setLoading("save");
    try {
      const result = await saveCertFn({
        data: {
          video_id: videoId,
          video_title: meta?.title ?? "Untitled",
          channel: meta?.author ?? null,
          thumbnail_url: meta?.thumbnail ?? null,
          difficulty,
          score,
          total_questions: questions.length,
          topics: summary?.topics ?? [],
          recipient_name: name.trim(),
        },
      });
      setCertId(result.id);
      toast.success("Certificate saved to your dashboard.");
      setStep("certificate");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save certificate");
    } finally {
      setLoading("");
    }
  }

  function submitQuiz() {
    if (answers.some((a) => a < 0)) {
      toast.error("Answer every question before submitting.");
      return;
    }
    setStep("result");
  }

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0), 0);
  const passed = questions.length > 0 && score / questions.length >= 0.7;

  return (
    <div className="h-screen max-h-screen relative overflow-hidden flex flex-col font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      {/* Fullscreen Golden Glow Cinematic Transition Overlay */}
      <div className={`screen-glow-overlay ${zoomState === 'zooming' ? 'active' : ''} ${zoomState === 'zooming-out' ? 'active-reverse' : ''}`} />

      {/* Fullscreen Video or Starry Sky Image Background */}
      {!showApp ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-1000 video-zoom-transition ${zoomState === "zooming" ? "video-zoomed" : ""} ${zoomState === "zooming-out" ? "video-zoom-out" : ""}`}
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
        </video>
      ) : (
        <div className={`absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${zoomState === 'zooming-out' ? 'app-bg-fade-out' : ''}`}>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_105838_084968f2-4415-42a4-971a-3bec54539549.mp4" type="video/mp4" />
          </video>
          {/* Subtle dark overlay to keep the text and glass cards beautiful and readable */}
          <div className="absolute inset-0 bg-slate-950/35" />
          {/* High-density sparkling transparent starry overlay on top of the looping abstract background */}
          <div className="super-starry-bg" />
        </div>
      )}

      {/* Navigation Bar */}
      {!(step === "quiz" && codingChallenge) && (
        <header className={`relative z-10 w-full ${(!showApp && zoomState === 'zooming') ? 'homepage-fade-out' : ''} ${zoomState === 'zooming-out' ? 'homepage-fade-in' : ''}`}>
          <nav className="flex flex-row justify-between items-center px-8 py-6 max-w-7xl mx-auto">
            {/* Logo */}
            <button
              onClick={() => goHome("hero")}
              className="text-3xl tracking-tight text-foreground hover:opacity-90 transition-opacity font-normal select-none cursor-pointer"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Certify<sup className="text-xs">®</sup>
            </button>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {showApp ? (
                <>
                  <button
                    onClick={() => goHome("hero")}
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setStep(lastCertStep)}
                    className={`text-sm font-semibold transition-colors cursor-pointer ${step !== "leetcode" ? "text-white border-b-2 border-emerald-500 pb-1" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Video Certifications
                  </button>
                  <button
                    onClick={() => setStep("leetcode")}
                    className={`text-sm font-semibold transition-colors cursor-pointer ${step === "leetcode" ? "text-white border-b-2 border-emerald-500 pb-1" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    DSA Problems
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => goHome("hero")}
                    className={`text-sm transition-colors cursor-pointer ${!showApp && homeView === "hero" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => goHome("about")}
                    className={`text-sm transition-colors cursor-pointer ${!showApp && homeView === "about" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    About
                  </button>
                  <button
                    onClick={() => goHome("reach")}
                    className={`text-sm transition-colors cursor-pointer ${!showApp && homeView === "reach" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Reach Us
                  </button>
                </>
              )}
            </div>

            {/* CTA / Auth controls */}
            <div className="flex items-center gap-6">
              {authLoading ? null : user ? (
                <>
                  <Link to="/dashboard" className="font-mono text-[10px] uppercase tracking-[0.3em] underline text-foreground/80 hover:text-foreground">
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => { await signOut(); goHome("hero"); }}
                    className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] transition-all cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth"
                    className="font-mono text-[10px] uppercase tracking-[0.3em] underline text-foreground/80 hover:text-foreground hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    Sign In
                  </Link>
                  <button
                    onClick={triggerBeginJourney}
                    className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] transition-all cursor-pointer"
                  >
                    Begin Journey
                  </button>
                </>
              )}
            </div>
          </nav>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full relative z-10 flex flex-col max-w-7xl mx-auto px-6 overflow-y-auto ${(step === "quiz" && codingChallenge) ? "py-4" : "py-10"
        } ${(!showApp && zoomState === 'zooming') ? 'homepage-fade-out' : ''} ${(showApp && zoomState === 'zooming-out') ? 'app-content-fade-out' : ''}`}>
        {!showApp ? (
          /* Homepage Panels */
          homeView === "hero" ? (
            /* Hero Section */
            <div className="flex flex-col items-center justify-center text-center px-6 pt-32 pb-40 py-[90px] my-auto">
              <h1
                className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal text-foreground animate-fade-rise select-text"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Where <em className="not-italic text-muted-foreground">videos</em> rise <em className="not-italic text-muted-foreground">into certifications.</em>
              </h1>

              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay font-sans select-text">
                We're designing tools for active learners, curious minds, and future experts. Amid the endless stream, we build digital credentials to showcase your real skills and focused learning.
              </p>

              <button
                onClick={triggerBeginJourney}
                className="liquid-glass rounded-full px-14 py-5 text-base text-foreground mt-12 hover:scale-[1.03] transition-all cursor-pointer animate-fade-rise-delay-2"
              >
                Begin Journey
              </button>
            </div>
          ) : homeView === "about" ? (
            /* About Section */
            <div className="liquid-glass rounded-2xl p-8 md:p-12 text-white shadow-2xl z-10 max-w-3xl mx-auto text-center animate-fade-rise my-auto">
              <h2
                className="text-4xl md:text-5xl font-normal text-white"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                A new era of active learning.
              </h2>
              <p className="mt-6 text-slate-300 text-sm md:text-base leading-relaxed font-sans select-text">
                Certify is a modern AI-powered platform designed to turn any YouTube tutorial, tech lecture, or educational video into a fully interactive certification.
              </p>
              <p className="mt-4 text-slate-300 text-sm md:text-base leading-relaxed font-sans select-text">
                By automatically fetching transcripts, generating intelligent summaries, and structuring adaptive quizzes (including interactive programming playgrounds for technical courses), we help you bridge the gap between passive video viewing and verified technical expertise.
              </p>
              <button
                onClick={() => setHomeView("hero")}
                className="liquid-glass rounded-full px-8 py-3 text-sm text-foreground mt-8 hover:scale-[1.03] transition-all cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          ) : (
            /* Reach Us Section */
            <div className="liquid-glass rounded-2xl p-8 md:p-12 text-white shadow-2xl z-10 max-w-3xl mx-auto text-center animate-fade-rise my-auto">
              <h2
                className="text-4xl md:text-5xl font-normal text-white"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Connect with Shubham.
              </h2>
              <p className="mt-4 text-slate-300 text-sm leading-relaxed font-sans select-text">
                Let's build the future of education together. Reach out to collaborate, share feedback, or check out my work across these platforms:
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 font-mono text-sm max-w-xl mx-auto">
                <a
                  href="https://instagram.com/ishubhamsha"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full py-3 px-6 transition-all hover:scale-[1.02] text-slate-200 hover:text-white w-full sm:w-auto"
                >
                  <Instagram className="h-4.5 w-4.5 text-white/80" />
                  <span>@ishubhamsha</span>
                </a>
                <a
                  href="https://linkedin.com/in/ishubhamsha"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full py-3 px-6 transition-all hover:scale-[1.02] text-slate-200 hover:text-white w-full sm:w-auto"
                >
                  <Linkedin className="h-4.5 w-4.5 text-white/80" />
                  <span>@ishubhamsha</span>
                </a>
                <a
                  href="https://github.com/ishubhamsha"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full py-3 px-6 transition-all hover:scale-[1.02] text-slate-200 hover:text-white w-full sm:w-auto"
                >
                  <Github className="h-4.5 w-4.5 text-white/80" />
                  <span>@ishubhamsha</span>
                </a>
              </div>

              <button
                onClick={() => setHomeView("hero")}
                className="liquid-glass rounded-full px-8 py-3 text-sm text-foreground mt-10 hover:scale-[1.03] transition-all cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          )
        ) : (
          /* Certify Interactive App */
          <div className="animate-fade-rise w-full">
            {step === "input" && (
              <InputStep
                url={url}
                setUrl={setUrl}
                loading={loading === "extract"}
                onSubmit={handleStart}
                customApiKey={customApiKey}
                setCustomApiKey={setCustomApiKey}
                testingKey={testingKey}
                testResult={testResult}
                onTestKey={handleTestKey}
                setTestResult={setTestResult}
                inputMode={inputMode}
                setInputMode={setInputMode}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                setSearchResults={setSearchResults}
                searchLoading={searchLoading}
                onSearch={handleSearch}
                onSearchSelect={handleSearchSelect}
                suggestedVideos={suggestedVideos}
                suggestedLoading={suggestedLoading}
                onRefreshSuggestions={loadSuggestions}
              />
            )}

            {step === "video" && (
              <VideoStep
                videoId={videoId}
                meta={meta}
                summary={summary}
                loadingSummary={loading === "summary"}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                onGenerateQuiz={runQuiz}
                generatingQuiz={loading === "quiz"}
                studyError={studyError}
                segments={segments}
                player={player}
                currentTime={currentTime}
                lastScrolledIdxRef={lastScrolledIdxRef}
                onBack={() => setStep("input")}
              />
            )}

            {step === "quiz" && (
              codingChallenge ? (
                <CodePlayground
                  challenge={codingChallenge}
                  difficulty={difficulty}
                  onPass={() => {
                    setAnswers([1]);
                    setStep("result");
                  }}
                />
              ) : (
                <QuizStep
                  questions={questions}
                  answers={answers}
                  setAnswers={setAnswers}
                  onSubmit={submitQuiz}
                  difficulty={difficulty}
                />
              )
            )}

            {step === "result" && (
              <ResultStep
                questions={questions}
                answers={answers}
                score={score}
                passed={passed}
                onRetry={() => {
                  setAnswers(new Array(questions.length).fill(-1));
                  setStep("quiz");
                }}
                onClaim={handleClaim}
                saving={loading === "save"}
                name={name}
                setName={setName}
              />
            )}

            {step === "certificate" && meta && (
              <div className="relative">
                <div className="confetti-container">
                  <div className="confetti-piece" />
                  <div className="confetti-piece" />
                  <div className="confetti-piece" />
                  <div className="confetti-piece" />
                  <div className="confetti-piece" />
                  <div className="confetti-piece" />
                  <div className="confetti-piece" />
                  <div className="confetti-piece" />
                  <div className="confetti-piece" />
                </div>
                <Certificate
                  name={name || "Student"}
                  videoTitle={meta.title}
                  difficulty={difficulty}
                  score={score}
                  total={questions.length}
                  date={new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  certId={certId}
                />
              </div>
            )}

            {step === "leetcode" && (
              <LeetCodeStep
                activeQuestion={activeLeetCodeQuestion}
                setActiveQuestion={handleSelectQuestion}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                userCode={userCode}
                setUserCode={setUserCode}
                runLoading={runLoading}
                compilerOutput={compilerOutput}
                leetcodeSolved={leetcodeSolved}
                leetcodeSolvedDates={leetcodeSolvedDates}
                currentStreak={currentStreak}
                leaderboard={leaderboard}
                handleRunCode={handleRunCode}
                handleSubmitSolution={handleSubmitSolution}
                questionsList={questionsList}
                leetcodeQuestionsLoading={leetcodeQuestionsLoading}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      {!(step === "quiz" && codingChallenge) && (
        <footer className={`border-t border-white/10 relative z-10 w-full mt-auto ${(!showApp && zoomState === 'zooming') ? 'homepage-fade-out' : ''} ${zoomState === 'zooming-out' ? 'homepage-fade-in' : ''}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground select-none">
            <span>Certify® © 2026</span>
            <span>1.2</span>
          </div>
        </footer>
      )}
    </div>
  );
}

function InputStep({
  url,
  setUrl,
  loading,
  onSubmit,
  customApiKey,
  setCustomApiKey,
  testingKey,
  testResult,
  onTestKey,
  setTestResult,
  inputMode,
  setInputMode,
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
  searchLoading,
  onSearch,
  onSearchSelect,
  suggestedVideos,
  suggestedLoading,
  onRefreshSuggestions,
}: {
  url: string;
  setUrl: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  customApiKey: string;
  setCustomApiKey: (v: string) => void;
  testingKey: boolean;
  testResult: { ok: boolean; message: string } | null;
  onTestKey: () => void;
  setTestResult: (r: { ok: boolean; message: string } | null) => void;
  inputMode: "search" | "url";
  setInputMode: (v: "search" | "url") => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchResults: YouTubeSearchResult[];
  setSearchResults: (results: YouTubeSearchResult[]) => void;
  searchLoading: boolean;
  onSearch: (e?: React.FormEvent, queryOverride?: string) => void;
  onSearchSelect: (result: YouTubeSearchResult) => void;
  suggestedVideos: YouTubeSearchResult[];
  suggestedLoading: boolean;
  onRefreshSuggestions: () => void;
}) {
  // Format relative time e.g. "2 years ago"
  function formatRelativeDate(dateStr: string) {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 1) return "Today";
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    } catch { return ""; }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Liquid Glass Input Card */}
      <div className="liquid-glass rounded-2xl p-8 md:p-12 text-white shadow-2xl z-10 relative">
        <div className="grid gap-12 md:grid-cols-12 relative z-10">
          {/* Left Column: Form & Call to Action */}
          <div className="md:col-span-7 flex flex-col justify-center">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold mb-4 select-none">
              Step 01 — Find your video
            </div>
            <h1
              className="text-4xl font-normal leading-[1.05] tracking-tight md:text-6xl text-white select-text"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Get certified on <em className="not-italic text-muted-foreground">any YouTube</em> video.
            </h1>
            <p className="mt-6 text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl select-text font-sans">
              Search YouTube directly or paste a URL. We fetch the transcript, generate an AI summary, build an adaptive quiz, and issue a
              printable certificate when you pass.
            </p>

            {/* Mode Toggle: Search / URL */}
            <div className="mt-8 flex rounded-full bg-white/5 border border-white/10 p-1 font-mono text-xs select-none shadow-md max-w-xs">
              <button
                type="button"
                onClick={() => setInputMode("search")}
                className={`flex-1 py-2.5 text-center uppercase tracking-wider font-semibold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${inputMode === "search" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
              <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`flex-1 py-2.5 text-center uppercase tracking-wider font-semibold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${inputMode === "url" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Paste URL
              </button>
            </div>

            {inputMode === "search" ? (
              /* Search Mode */
              <form onSubmit={onSearch} className="mt-5 space-y-4 max-w-2xl">
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground select-none">Search YouTube</label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <input
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g. React hooks tutorial, Python crash course…"
                        className="h-13 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-6 font-mono text-sm text-white placeholder-muted-foreground/40 outline-none focus:border-white/30 focus:ring-2 focus:ring-white/5 transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searchLoading}
                      className="h-13 rounded-full px-8 bg-white text-black hover:scale-[1.02] active:scale-[0.98] font-mono text-xs uppercase tracking-wide font-semibold transition-all border-none shrink-0 cursor-pointer flex items-center gap-2 justify-center"
                    >
                      {searchLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</>
                      ) : (
                        "Search →"
                      )}
                    </button>
                  </div>

                  {/* Horizontal Scrollable Suggestions Bar */}
                  <div className="flex gap-2 overflow-x-auto pb-2 pt-1.5 scrollbar-none scroll-smooth select-none -mx-1 px-1">
                    {["All", "Python", "React & Next.js", "JavaScript", "Algorithms", "System Design", "Machine Learning", "SQL", "Web Dev"].map((topic) => {
                      const isActive = topic === "All" ? !searchQuery : searchQuery.toLowerCase().includes(topic.toLowerCase().split(" ")[0]);
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => {
                            if (topic === "All") {
                              setSearchQuery("");
                            } else {
                              setSearchQuery(topic);
                              void onSearch(undefined, topic);
                            }
                          }}
                          className={`shrink-0 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all border font-semibold cursor-pointer ${isActive
                            ? "bg-white text-black border-white shadow-md scale-102"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20 hover:text-white"
                            }`}
                        >
                          {topic}
                        </button>
                      );
                    })}
                  </div>

                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 select-none">
                    Powered by YouTube Data API · ~100 free searches/day
                  </p>
                </div>
              </form>
            ) : (
              /* URL Paste Mode */
              <form onSubmit={onSubmit} className="mt-5 space-y-4 max-w-2xl">
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground select-none">YouTube URL</label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      autoFocus
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=…"
                      className="h-13 flex-1 rounded-full border border-white/10 bg-white/5 px-6 font-mono text-sm text-white placeholder-muted-foreground/40 outline-none focus:border-white/30 focus:ring-2 focus:ring-white/5 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="h-13 rounded-full px-8 bg-white text-black hover:scale-[1.02] active:scale-[0.98] font-mono text-xs uppercase tracking-wide font-semibold transition-all border-none shrink-0 cursor-pointer"
                    >
                      {loading ? "Fetching…" : "Analyze Video →"}
                    </button>
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 select-none">
                    Supports youtube.com/watch · youtu.be · shorts
                  </p>
                </div>
              </form>
            )}

            {/* Collapsible Custom API Key settings */}
            <div className="mt-4 max-w-2xl">
              <details className="group border border-white/10 rounded-xl bg-white/5 p-3.5 overflow-hidden transition-all duration-300">
                <summary className="list-none flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80 hover:text-foreground cursor-pointer select-none">
                  <span className="flex items-center gap-1.5">🔑 Custom Gemini API Key (Optional)</span>
                  <span className="transition-transform duration-200 group-open:rotate-180 text-[8px]">▼</span>
                </summary>
                <div className="mt-3.5 space-y-3 animate-fade-in">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="Paste your Gemini API key (AIzaSy...)"
                      className="flex-1 h-11 rounded-lg border border-white/10 bg-black/30 px-4 font-mono text-xs text-white placeholder-muted-foreground/40 outline-none focus:border-white/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={onTestKey}
                      disabled={testingKey}
                      className="h-11 px-4 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white font-mono text-[10px] uppercase tracking-wider transition-all hover:scale-[1.02] shrink-0 cursor-pointer"
                    >
                      {testingKey ? "Testing..." : "Test Key"}
                    </button>
                    {customApiKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomApiKey("");
                          setTestResult(null);
                          toast.success("Custom API Key cleared! Using built-in keys.");
                        }}
                        className="h-11 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-mono text-[10px] uppercase tracking-wider transition-all hover:scale-[1.02] shrink-0 cursor-pointer animate-fade-in"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {testResult && (
                    <div className={`text-[11px] p-3 rounded-lg border font-mono select-text transition-all ${testResult.ok
                      ? "bg-green-500/10 border-green-500/25 text-green-400"
                      : "bg-red-500/10 border-red-500/25 text-red-400"
                      }`}>
                      <div className="font-semibold flex items-center gap-1.5">
                        {testResult.ok ? "🟢 Success" : "🔴 Error"}
                      </div>
                      <div className="mt-1 leading-normal font-sans opacity-95">{testResult.message}</div>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/80 font-sans leading-relaxed select-text">
                    Stored locally in this browser. If provided, this key is used to bypass shared rate limits. Grab your free key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#fbbf24] hover:underline font-semibold">Google AI Studio</a>.
                  </p>
                </div>
              </details>
            </div>
          </div>

          {/* Right Column: Timeline */}
          <div className="md:col-span-5 flex items-center">
            <div className="bg-white/5 border border-white/10 p-6 rounded-xl w-full backdrop-blur-md">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold border-b border-white/10 pb-3 mb-4 select-none">
                How it works
              </div>
              <ol className="space-y-4">
                {[
                  ["01", "Search or paste a YouTube URL"],
                  ["02", "Auto-fetch transcript"],
                  ["03", "AI summary + key points"],
                  ["04", "Pick Beginner / Intermediate / Expert"],
                  ["05", "Take 8-question quiz"],
                  ["06", "Earn your certificate"],
                ].map(([n, label]) => (
                  <li key={n} className="flex items-start gap-4 border-t border-white/5 pt-3 first:border-0 first:pt-0">
                    <span className="font-mono text-xs bg-white/5 border border-white/20 text-foreground h-6 w-6 rounded-full flex items-center justify-center shrink-0 font-bold select-none">{n}</span>
                    <span
                      className="text-sm text-foreground/80 font-medium self-center select-text"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results Grid */}
      {inputMode === "search" && searchResults.length > 0 && (
        <div className="animate-fade-rise">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground select-none">
              {searchResults.length} results found
            </div>
            <button
              onClick={() => { setSearchQuery(""); setSearchResults([]); }}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 hover:text-white cursor-pointer transition-colors"
            >
              Clear results
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((result) => (
              <button
                key={result.videoId}
                onClick={() => onSearchSelect(result)}
                disabled={loading}
                className="yt-search-card group text-left liquid-glass rounded-xl border border-white/10 overflow-hidden hover:border-white/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
                      <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-white/90 font-sans">
                    {result.title}
                  </h3>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                      {result.channel}
                    </span>
                    {result.publishedAt && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 shrink-0">
                        {formatRelativeDate(result.publishedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recommended/Suggested Study Videos Grid */}
      {inputMode === "search" && searchResults.length === 0 && !searchLoading && (
        <div className="animate-fade-rise space-y-5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/95">
                Suggested For You
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <button
              onClick={onRefreshSuggestions}
              disabled={suggestedLoading}
              className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 hover:text-white cursor-pointer transition-all flex items-center gap-1.5 hover:scale-102 disabled:opacity-50"
            >
              🔄 Refresh Recommendations
            </button>
          </div>

          {suggestedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="liquid-glass rounded-xl border border-white/10 p-4 space-y-3">
                  <Skeleton className="aspect-video w-full rounded-lg bg-white/5" />
                  <Skeleton className="h-4 w-5/6 bg-white/5" />
                  <Skeleton className="h-3 w-1/3 bg-white/5" />
                </div>
              ))}
            </div>
          ) : suggestedVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedVideos.map((result) => (
                <button
                  key={result.videoId}
                  onClick={() => onSearchSelect(result)}
                  disabled={loading}
                  className="yt-search-card group text-left liquid-glass rounded-xl border border-white/10 overflow-hidden hover:border-white/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                    <img
                      src={result.thumbnail}
                      alt={result.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
                        <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-white/90 font-sans">
                      {result.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                        {result.channel}
                      </span>
                      {result.publishedAt && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 shrink-0">
                          {formatRelativeDate(result.publishedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center font-mono text-xs text-muted-foreground py-12 liquid-glass rounded-xl border border-white/5">
              Could not load suggested study videos. Use the search bar to find a tutorial!
            </div>
          )}
        </div>
      )}

      {/* Search Loading State */}
      {inputMode === "search" && searchLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-rise">
          <Loader2 className="h-8 w-8 text-white/60 animate-spin" />
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Searching YouTube…</p>
        </div>
      )}
    </div>
  );
}

function VideoStep({
  videoId,
  meta,
  summary,
  loadingSummary,
  difficulty,
  setDifficulty,
  onGenerateQuiz,
  generatingQuiz,
  studyError,
  segments,
  player,
  currentTime,
  lastScrolledIdxRef,
  onBack,
}: {
  videoId: string;
  meta: { title: string; author: string } | null;
  summary: { summary: string; keyPoints: string[]; topics: string[] } | null;
  loadingSummary: boolean;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  onGenerateQuiz: () => void;
  generatingQuiz: boolean;
  studyError?: string;
  segments: { text: string; offset: number; duration: number }[];
  player: any;
  currentTime: number;
  lastScrolledIdxRef: { current: number };
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">("summary");
  const [searchQuery, setSearchQuery] = useState("");

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const filteredSegments = segments.filter((seg) =>
    seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSegmentIndex = segments.reduce((bestIdx, seg, idx) => {
    if (currentTime >= seg.offset) {
      return idx;
    }
    return bestIdx;
  }, -1);

  // Auto-scroll active segment smoothly on playback updates (only on transition)
  useEffect(() => {
    if (activeSegmentIndex >= 0 && activeSegmentIndex !== lastScrolledIdxRef.current) {
      lastScrolledIdxRef.current = activeSegmentIndex;
      const el = document.getElementById(`seg-${activeSegmentIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeSegmentIndex, lastScrolledIdxRef]);

  const handleSegmentClick = (offsetMs: number) => {
    if (player && typeof player.seekTo === "function") {
      player.seekTo(offsetMs / 1000, true);
      player.playVideo();
    }
  };

  const handleSyncToPlayback = () => {
    if (activeSegmentIndex >= 0) {
      const el = document.getElementById(`seg-${activeSegmentIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        toast.success("Synced to current video playback time!");
      }
    } else {
      toast.info("No active playback segment detected yet.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 w-full max-w-7xl mx-auto">
      {/* Back to Search Button spanning full width */}
      <div className="lg:col-span-12 flex justify-start animate-fade-rise">
        <button
          onClick={onBack}
          className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-white transition-all bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-5 py-2.5 rounded-full hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none shadow-md"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Search Results
        </button>
      </div>

      <div className="lg:col-span-8 space-y-4">
        {/* Dynamic target container for YT Player iframe API */}
        <div className="aspect-video w-full border border-white/10 rounded-2xl bg-black/60 backdrop-blur-md overflow-hidden relative shadow-xl" id="yt-player-container">
          <div id="yt-player-frame" className="h-full w-full" />
        </div>
        {meta && (
          <div className="px-2">
            <h2 className="text-2xl font-normal leading-tight text-white select-text animate-fade-rise" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {meta.title}
            </h2>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground select-text mt-1">
              {meta.author}
            </p>
          </div>
        )}

        <div className="liquid-glass p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Difficulty</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
              Choose one
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["beginner", "intermediate", "expert"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`rounded-xl px-4 py-4 text-left border transition-all cursor-pointer ${difficulty === d
                  ? "bg-white/10 border-white/30 text-white scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/8 hover:border-white/20"
                  }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                  {d === "beginner" ? "01" : d === "intermediate" ? "02" : "03"}
                </div>
                <div className="text-lg capitalize font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>{d}</div>
              </button>
            ))}
          </div>

          {studyError ? (
            <div className="mt-6 border border-rose-500 bg-rose-500/10 p-5 font-mono text-xs text-rose-500 flex flex-col gap-2 rounded-xl">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-500 animate-pulse" />
                <span>EDUCATIONAL CONTENT VERIFICATION FAILED</span>
              </div>
              <p className="leading-relaxed mt-1 select-text">{studyError}</p>
              <p className="text-[10px] text-rose-400 mt-3 border-t border-rose-500/20 pt-2 uppercase tracking-wider">
                To proceed, please try pasting an educational tutorial, lecture, or instructional video URL.
              </p>
            </div>
          ) : (
            <button
              onClick={onGenerateQuiz}
              disabled={!summary || generatingQuiz}
              className="mt-6 h-12 w-full rounded-full bg-white text-black font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all text-sm uppercase tracking-wide disabled:opacity-50 cursor-pointer"
            >
              {generatingQuiz ? "Generating quiz…" : "Generate quiz →"}
            </button>
          )}
        </div>
      </div>

      <aside className="lg:col-span-4 flex flex-col gap-4 animate-fade-rise">
        <div className="flex rounded-full bg-white/5 border border-white/10 p-1 font-mono text-xs select-none shadow-md">
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex-1 py-2.5 text-center uppercase tracking-wider font-semibold rounded-full transition-all cursor-pointer ${activeTab === "summary" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
          >
            AI Summary
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`flex-1 py-2.5 text-center uppercase tracking-wider font-semibold rounded-full transition-all cursor-pointer ${activeTab === "transcript" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
          >
            Transcript
          </button>
        </div>

        {activeTab === "summary" ? (
          <div className="liquid-glass p-6 rounded-2xl shadow-xl flex-1 overflow-y-auto min-h-[400px]">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground border-b border-white/10 pb-2 mb-3">AI Overview</div>
            {loadingSummary && (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full bg-white/5" />
                <Skeleton className="h-4 w-5/6 bg-white/5" />
                <Skeleton className="h-4 w-4/6 bg-white/5" />
                <Skeleton className="h-4 w-full bg-white/5" />
              </div>
            )}
            {summary && (
              <>
                <p className="mt-4 text-sm leading-relaxed text-slate-200 select-text font-sans">{summary.summary}</p>
                <div className="mt-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground border-b border-white/5 pb-1 mb-2">
                    Key points
                  </div>
                  <ul className="mt-3 space-y-2">
                    {summary.keyPoints.map((k, i) => (
                      <li key={i} className="flex gap-3 border-t border-white/5 pt-2 text-sm text-slate-300">
                        <span className="font-mono text-xs text-muted-foreground select-none">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="select-text font-sans">{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {summary.topics.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2 pt-3 border-t border-white/5">
                    {summary.topics.map((t) => (
                      <span
                        key={t}
                        className="border border-white/10 rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-wider bg-white/5 text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="liquid-glass p-6 rounded-2xl shadow-xl flex flex-col h-[550px]">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground border-b border-white/10 pb-2 mb-3 flex items-center justify-between">
              <span>Interactive Reader</span>
              {activeSegmentIndex >= 0 && (
                <button
                  onClick={handleSyncToPlayback}
                  className="font-mono text-[9px] uppercase tracking-wider bg-white/10 text-white border border-white/20 px-2.5 py-1 rounded hover:bg-white hover:text-black transition-all font-semibold cursor-pointer"
                >
                  🎯 Sync to Playback
                </button>
              )}
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="h-10 w-full border border-white/10 bg-white/5 rounded-lg px-3 font-mono text-xs text-white placeholder-muted-foreground/40 outline-none focus:border-white/30 mb-4"
            />

            <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
              {filteredSegments.length > 0 ? (
                filteredSegments.map((seg) => {
                  const trueIdx = segments.indexOf(seg);
                  const isActive = activeSegmentIndex === trueIdx;
                  return (
                    <div
                      key={trueIdx}
                      id={`seg-${trueIdx}`}
                      onClick={() => handleSegmentClick(seg.offset)}
                      className={`group flex gap-3 p-2.5 border rounded-xl cursor-pointer font-sans text-sm transition-all ${isActive
                        ? "border-white/30 bg-white/10 text-white scale-[1.01] shadow-md font-medium"
                        : "border-transparent hover:bg-white/5 text-muted-foreground hover:text-white"
                        }`}
                    >
                      <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 h-fit self-center transition-all ${isActive
                        ? "bg-white text-black font-black scale-105"
                        : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white hover:text-black"
                        }`}>
                        {formatTime(seg.offset)}
                      </span>
                      <span className="leading-relaxed select-text">
                        <HighlightText text={seg.text} query={searchQuery} />
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center font-mono text-xs text-muted-foreground py-8">
                  No matching transcript parts found.
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function QuizStep({
  questions,
  answers,
  setAnswers,
  onSubmit,
  difficulty,
}: {
  questions: Question[];
  answers: number[];
  setAnswers: (a: number[]) => void;
  onSubmit: () => void;
  difficulty: Difficulty;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const q = questions[currentIdx];
  const answeredCount = answers.filter((a) => a >= 0).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "a" || key === "b" || key === "c" || key === "d") {
        const oi = key.charCodeAt(0) - 97; // 'a' -> 0, 'b' -> 1 etc
        if (oi < q.options.length) {
          const next = [...answers];
          next[currentIdx] = oi;
          setAnswers(next);
          toast.success(`Selected Option ${key.toUpperCase()}`);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
      } else if (e.key === "ArrowRight") {
        if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIdx, q, answers, setAnswers, questions.length]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-rise w-full">
      {/* Top Progress bar and Indicator */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 select-none">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Quiz · {difficulty}
          </div>
          <h2 className="mt-2 text-2xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Answer all {questions.length} questions
          </h2>
        </div>
        <div className="font-mono text-xs bg-white text-black px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider shadow-sm">
          {answeredCount}/{questions.length} Answered
        </div>
      </div>

      {/* Stepper Navigation bar */}
      <div className="flex justify-between items-center liquid-glass rounded-2xl p-4 font-mono text-xs select-none shadow-md">
        <div className="flex gap-1.5 flex-wrap">
          {questions.map((_, idx) => {
            const isCompleted = answers[idx] >= 0;
            const isActive = currentIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`h-8 w-8 rounded-full border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${isActive
                  ? "bg-white text-black border-white scale-110 shadow-lg"
                  : isCompleted
                    ? "bg-white/10 border-white/30 text-white hover:bg-white/20"
                    : "border-white/10 text-muted-foreground hover:border-white hover:bg-white/5"
                  }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
        <div className="font-semibold uppercase tracking-wider text-muted-foreground text-[9px] hidden sm:block">
          Question {currentIdx + 1} of {questions.length}
        </div>
      </div>

      {/* Question Card */}
      <div className="liquid-glass p-8 rounded-2xl space-y-6 shadow-xl">
        <div className="flex gap-4">
          <span className="font-mono text-xs bg-white/5 border border-white/10 px-2.5 py-1 h-fit font-semibold rounded shrink-0 select-none">
            Q{String(currentIdx + 1).padStart(2, "0")}
          </span>
          <h3 className="text-xl font-normal leading-snug self-center select-text" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {parseInlineMarkdown(q.question)}
          </h3>
        </div>

        {/* Options */}
        <div className="grid gap-2">
          {q.options.map((opt, oi) => {
            const active = answers[currentIdx] === oi;
            return (
              <button
                key={oi}
                onClick={() => {
                  const next = [...answers];
                  next[currentIdx] = oi;
                  setAnswers(next);
                }}
                className={`flex items-start gap-4 border rounded-xl px-4 py-3.5 text-left transition-all group cursor-pointer ${active
                  ? "bg-white/15 border-white/30 text-white font-medium scale-[1.01] shadow-md"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/8 hover:border-white/25 hover:translate-x-1"
                  }`}
              >
                <span className={`font-mono text-xs border rounded px-2 py-0.5 ${active ? "bg-white text-black border-white font-bold" : "border-white/10 text-muted-foreground group-hover:text-foreground"
                  }`}>
                  {String.fromCharCode(65 + oi)}
                </span>
                <span className="text-sm font-medium self-center select-text font-sans">{parseInlineMarkdown(opt)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hotkeys Prompt */}
      <div className="text-center font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest select-none">
        Tip: Press <kbd className="border border-white/20 px-1.5 py-0.5 rounded bg-white/5">A</kbd>–<kbd className="border border-white/20 px-1.5 py-0.5 rounded bg-white/5">D</kbd> to select or <kbd className="border border-white/20 px-1.5 py-0.5 rounded bg-white/5">←</kbd> / <kbd className="border border-white/20 px-1.5 py-0.5 rounded bg-white/5">→</kbd> to navigate
      </div>

      {/* Bottom slide controllers */}
      <div className="flex justify-between items-center gap-4 mt-6 select-none">
        <button
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(currentIdx - 1)}
          className="rounded-full font-mono text-xs uppercase tracking-wider px-6 py-2.5 border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-30 cursor-pointer"
        >
          ← Previous
        </button>

        {currentIdx < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIdx(currentIdx + 1)}
            disabled={answers[currentIdx] < 0}
            className="rounded-full font-mono text-xs uppercase tracking-wider px-6 py-2.5 bg-white text-black font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            Next Question →
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={answers.some((a) => a < 0)}
            className="rounded-full font-mono text-xs uppercase tracking-wider px-6 py-2.5 bg-white text-black font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer animate-pulse"
          >
            Submit answers →
          </button>
        )}
      </div>
    </div>
  );
}

function ResultStep({
  questions,
  answers,
  score,
  passed,
  onRetry,
  onClaim,
  saving,
  name,
  setName,
}: {
  questions: Question[];
  answers: number[];
  score: number;
  passed: boolean;
  onRetry: () => void;
  onClaim: () => void;
  saving: boolean;
  name: string;
  setName: (v: string) => void;
}) {
  const pct = Math.round((score / questions.length) * 100);
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-rise w-full">
      <div className="liquid-glass rounded-2xl overflow-hidden border border-white/10 shadow-xl">
        <div className="grid grid-cols-3 divide-x border-b border-white/10 divide-white/10 select-none">
          <Stat label="Score" value={`${score}/${questions.length}`} />
          <Stat label="Percentage" value={`${pct}%`} />
          <Stat label="Result" value={passed ? "PASS" : "FAIL"} accent={passed} />
        </div>
        <div className="p-8">
          {passed ? (
            <>
              <h2 className="text-3xl font-normal text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>You passed.</h2>
              <p className="mt-2 text-muted-foreground text-sm font-sans select-text">
                Enter your name as you want it printed on the certificate.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="h-12 flex-1 rounded-full border border-white/10 bg-white/5 px-5 font-sans text-sm text-white placeholder-muted-foreground/45 outline-none focus:border-white/30 transition-all"
                />
                <button
                  disabled={!name.trim() || saving}
                  onClick={onClaim}
                  className="h-12 rounded-full px-8 bg-white text-black font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  {saving ? "Saving…" : "Claim certificate →"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-normal text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>Not quite — 70% required.</h2>
              <p className="mt-2 text-muted-foreground text-sm font-sans select-text">Review the answers below and try again.</p>
              <button
                onClick={onRetry}
                className="mt-6 h-12 rounded-full px-8 bg-white text-black font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Retake quiz →
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-normal text-white px-1" style={{ fontFamily: "'Instrument Serif', serif" }}>Review</h3>
        {questions.map((q, i) => {
          const correct = answers[i] === q.answerIndex;
          return (
            <div key={i} className="liquid-glass rounded-2xl p-6 border border-white/10 space-y-4 shadow-md">
              <div className="flex justify-between gap-4">
                <h4 className="text-lg font-normal leading-snug text-white select-text" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Q{i + 1}. {parseInlineMarkdown(q.question)}
                </h4>
                <span
                  className={`shrink-0 border rounded-full px-3 py-0.5 font-mono text-[9px] uppercase tracking-wider select-none ${correct ? "bg-white/15 border-white/30 text-white" : "border-white/10 text-muted-foreground"
                    }`}
                >
                  {correct ? "Correct" : "Wrong"}
                </span>
              </div>
              <div className="mt-3 grid gap-1.5 text-sm">
                <div className="select-text">
                  <span className="font-mono text-xs text-muted-foreground">Your answer: </span>
                  {answers[i] >= 0 ? parseInlineMarkdown(q.options[answers[i]]) : "—"}
                </div>
                {!correct && (
                  <div className="select-text">
                    <span className="font-mono text-xs text-muted-foreground">Correct: </span>
                    {q.options[q.answerIndex] ? parseInlineMarkdown(q.options[q.answerIndex]) : "—"}
                  </div>
                )}
                {q.explanation && (
                  <p className="mt-2 border-t border-white/5 pt-2 font-mono text-xs text-muted-foreground select-text font-normal">
                    {parseInlineMarkdown(q.explanation)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-6 ${accent ? "bg-white/5 text-white font-medium" : ""}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-70 select-none">{label}</div>
      <div className="mt-2 text-4xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>{value}</div>
    </div>
  );
}

// ─── LEETCODE COMPONENTS ────────────────────────────────────────────────────────

function DescriptionRenderer({ text }: { text: string }) {
  const sections = text.split("\n\n");
  return (
    <div className="space-y-4 text-slate-300 text-sm leading-relaxed select-text font-sans">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (trimmed.startsWith("###")) {
          return (
            <h4 key={idx} className="text-base font-semibold text-slate-100 border-b border-white/5 pb-1 mt-6 font-mono">
              {trimmed.replace("###", "").trim()}
            </h4>
          );
        }
        if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          const items = trimmed.split("\n");
          return (
            <ul key={idx} className="list-disc pl-5 space-y-2 text-slate-300">
              {items.map((item, i) => (
                <li key={i}>{parseInlineMarkdown(item.replace(/^-\s*|^\*\s*/, "").trim())}</li>
              ))}
            </ul>
          );
        }
        if (trimmed.startsWith("```")) {
          const codeText = trimmed.replace(/```[a-z]*|```$/g, "").trim();
          return (
            <pre key={idx} className="bg-slate-950 border border-white/5 rounded-xl p-4 font-mono text-xs text-cyan-300 overflow-x-auto select-all my-4">
              <code>{codeText}</code>
            </pre>
          );
        }
        return <p key={idx}>{parseInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

function parseTestCasesFromDescription(description: string): { input: string; output: string; explanation?: string }[] {
  const cases: { input: string; output: string; explanation?: string }[] = [];
  if (!description) return cases;

  // Split by examples
  const exampleBlocks = description.split(/(?:###?\s*Example|Example\s*\d+:?)/gi);

  // Skip the first part (which is the general description)
  for (let i = 1; i < exampleBlocks.length; i++) {
    const block = exampleBlocks[i];

    // Find Input: and Output:
    const inputMatch = block.match(/Input:\s*([^\n]+)/i);
    const outputMatch = block.match(/Output:\s*([^\n]+)/i);
    const explanationMatch = block.match(/Explanation:\s*([\s\S]+)/i);

    if (inputMatch && outputMatch) {
      cases.push({
        input: inputMatch[1].replace(/[`*]/g, "").trim(),
        output: outputMatch[1].replace(/[`*]/g, "").trim(),
        explanation: explanationMatch ? explanationMatch[1].split(/(?:###|Constraints:)/i)[0].replace(/[`*]/g, "").trim() : undefined
      });
    }
  }

  // Fallback if no structured examples found
  if (cases.length === 0) {
    // Try to match any Input: / Output: pairs in the whole text
    const inputRegex = /Input:\s*([^\n]+)\s*\n\s*Output:\s*([^\n]+)/gi;
    let match;
    while ((match = inputRegex.exec(description)) !== null) {
      cases.push({
        input: match[1].replace(/[`*]/g, "").trim(),
        output: match[2].replace(/[`*]/g, "").trim()
      });
    }
  }

  return cases;
}

function LeetCodeStep({
  activeQuestion,
  setActiveQuestion,
  selectedLanguage,
  setSelectedLanguage,
  userCode,
  setUserCode,
  runLoading,
  compilerOutput,
  leetcodeSolved,
  leetcodeSolvedDates,
  currentStreak,
  leaderboard,
  handleRunCode,
  handleSubmitSolution,
  questionsList,
  leetcodeQuestionsLoading,
}: {
  activeQuestion: any;
  setActiveQuestion: (q: any) => void;
  selectedLanguage: "python" | "javascript" | "cpp";
  setSelectedLanguage: (l: "python" | "javascript" | "cpp") => void;
  userCode: string;
  setUserCode: (c: string) => void;
  runLoading: boolean;
  compilerOutput: any;
  leetcodeSolved: string[];
  leetcodeSolvedDates: string[];
  currentStreak: number;
  leaderboard: any[];
  handleRunCode: () => void;
  handleSubmitSolution: () => void;
  questionsList: any[];
  leetcodeQuestionsLoading: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [timeLeft, setTimeLeft] = useState("");
  const [leftTab, setLeftTab] = useState<"description" | "testcases">("description");

  const testCases = useMemo(() => {
    return parseTestCasesFromDescription(activeQuestion?.description || "");
  }, [activeQuestion]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(24, 0, 0, 0); // Midnight tonight
      const diffMs = target.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft("00:00:00 left");
        return;
      }
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeLeft(
        `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")} left`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter problems
  const filteredQuestions = questionsList.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || q.category === selectedCategory;
    const matchesDifficulty =
      selectedDifficulty === "All" || q.difficulty === selectedDifficulty.toLowerCase();
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  if (activeQuestion) {
    // Dual Pane Workspace
    const lines = userCode.split("\n");
    return (
      <div className="grid gap-6 lg:grid-cols-12 w-full max-w-7xl mx-auto h-[calc(100vh-140px)] min-h-[500px]">
        {/* Left Pane: Description */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md animate-fade-rise">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-white/10 p-4 shrink-0 bg-slate-950/40 select-none">
            <button
              onClick={() => setActiveQuestion(null)}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold tracking-wider ${activeQuestion.difficulty === "easy"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                : activeQuestion.difficulty === "medium"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                }`}>
                {activeQuestion.difficulty}
              </span>
              <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-300">
                {activeQuestion.category}
              </span>
            </div>
          </div>

          {/* Tabs row */}
          <div className="flex border-b border-white/5 bg-slate-950/20 px-4 select-none shrink-0">
            <button
              onClick={() => setLeftTab("description")}
              className={`flex-1 py-3 text-center font-mono text-[10px] uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer ${leftTab === "description"
                  ? "border-emerald-500 text-white"
                  : "border-transparent text-muted-foreground hover:text-white"
                }`}
            >
              Description
            </button>
            <button
              onClick={() => setLeftTab("testcases")}
              className={`flex-1 py-3 text-center font-mono text-[10px] uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer ${leftTab === "testcases"
                  ? "border-emerald-500 text-white"
                  : "border-transparent text-muted-foreground hover:text-white"
                }`}
            >
              Test Cases ({testCases.length})
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {leftTab === "description" ? (
              <>
                <h2 className="text-2xl font-normal leading-tight text-white mb-2" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  {activeQuestion.id}. {activeQuestion.title}
                </h2>
                <div className="font-mono text-[10px] text-muted-foreground/60 mb-6 uppercase tracking-wider">
                  Acceptance Rate: {activeQuestion.acceptance}
                </div>
                <DescriptionRenderer text={activeQuestion.description} />
              </>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xl font-normal leading-tight text-white mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Sample Test Cases
                </h3>
                <p className="text-xs text-muted-foreground/80 mb-4 font-sans select-text">
                  Below are the extracted example test cases for this challenge. Click <strong>Run Code</strong> to test your solution against these, or <strong>Submit Solution</strong> to run secret grading compiler checks.
                </p>
                {testCases.length > 0 ? (
                  <div className="space-y-4">
                    {testCases.map((tc, index) => (
                      <div key={index} className="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3 font-sans">
                        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-muted-foreground select-none">
                          <span>Test Case {index + 1}</span>
                          {index === 0 && <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">Sample</span>}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="font-mono text-[10px] text-slate-400 mb-1 select-none">Input:</div>
                            <pre className="bg-slate-950 border border-white/5 rounded-lg p-2.5 font-mono text-xs text-cyan-300 overflow-x-auto select-all">
                              <code>{tc.input}</code>
                            </pre>
                          </div>
                          <div>
                            <div className="font-mono text-[10px] text-slate-400 mb-1 select-none">Expected Output:</div>
                            <pre className="bg-slate-950 border border-white/5 rounded-lg p-2.5 font-mono text-xs text-emerald-300 overflow-x-auto select-all">
                              <code>{tc.output}</code>
                            </pre>
                          </div>
                          {tc.explanation && (
                            <div className="text-xs text-slate-400 font-sans leading-relaxed">
                              <span className="font-semibold text-slate-300 font-mono text-[10px] block mb-1">Explanation:</span>
                              {tc.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center font-mono text-xs text-muted-foreground py-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                    No explicit sample test cases parsed. Use hidden compiler assertions on Submit!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: IDE + Console */}
        <div className="lg:col-span-7 flex flex-col h-full bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md animate-fade-rise">
          {/* Header Row with Lang Selector */}
          <div className="flex items-center justify-between border-b border-white/10 p-4 shrink-0 bg-slate-950/40 select-none">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-200 flex items-center gap-1.5 font-semibold">
              <Terminal className="h-3.5 w-3.5 text-cyan-400" /> Editor Workspace
            </span>
            <div className="flex items-center gap-3">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as any)}
                className="bg-[#1a1a1a] text-slate-200 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="cpp">C++</option>
              </select>
              <button
                onClick={() => {
                  if (confirm("Reset editor code to boilerplate template? This will erase your current work.")) {
                    setUserCode(activeQuestion.starterCode[selectedLanguage]);
                    toast.success("Editor reset.");
                  }
                }}
                className="font-mono text-[10px] bg-white/5 border border-white/10 text-muted-foreground hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Code Typing Area */}
          <div className="flex-1 flex font-mono text-sm bg-slate-950 relative overflow-hidden">
            {/* Line numbers column */}
            <div className="bg-slate-900/30 text-slate-600 text-right select-none py-4 px-3 border-r border-white/5 font-mono text-xs w-10 flex flex-col items-end select-none h-full overflow-y-hidden">
              {lines.map((_, i) => (
                <div key={i} className="h-6 leading-6">{i + 1}</div>
              ))}
            </div>
            {/* TextArea editor */}
            <textarea
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              className="flex-1 bg-transparent text-slate-100 py-4 px-4 h-full outline-none resize-none leading-6 font-mono text-sm scrollbar-thin select-text"
              spellCheck={false}
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-white/10 p-4 shrink-0 bg-slate-950/40 select-none">
            <button
              onClick={handleRunCode}
              disabled={runLoading}
              className="font-mono text-xs uppercase tracking-wider px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              <Play className="h-3.5 w-3.5 fill-white/10" /> Run Code
            </button>
            <button
              onClick={handleSubmitSolution}
              disabled={runLoading}
              className="font-mono text-xs uppercase tracking-wider px-7 py-2.5 rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <Zap className="h-3.5 w-3.5 fill-slate-950/10 text-slate-950" /> Submit Solution
            </button>
          </div>

          {/* Grader Console Drawer */}
          {compilerOutput && (
            <div className="border-t border-white/10 shrink-0 select-text max-h-[160px] overflow-y-auto">
              <div className={`p-4 border-l-4 ${compilerOutput.status === "running"
                ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                : compilerOutput.status === "success"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500 text-rose-400"
                }`}>
                <div className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    {compilerOutput.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {compilerOutput.status === "success" && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {compilerOutput.status === "failed" && <XCircle className="h-3.5 w-3.5 animate-pulse" />}
                    {compilerOutput.status === "running"
                      ? "Executing code assertions..."
                      : compilerOutput.status === "success"
                        ? "Accepted"
                        : "Submission Failed / Wrong Answer"}
                  </span>
                </div>
                {compilerOutput.compileError && (
                  <pre className="mt-2 p-3 bg-black/40 rounded-xl font-mono text-[11px] text-rose-400 overflow-x-auto border border-rose-500/15 leading-relaxed">
                    {compilerOutput.compileError}
                  </pre>
                )}
                {compilerOutput.stdout && (
                  <pre className="mt-2 p-3 bg-black/40 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto border border-white/5 leading-relaxed">
                    {compilerOutput.stdout}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="grid gap-6 lg:grid-cols-12 w-full max-w-7xl mx-auto">
      {/* Sidebar Panel */}
      <aside className="lg:col-span-4 flex flex-col gap-6 animate-fade-rise">
        {/* Streak Calendar Tracker */}
        <div className="bg-[#1e1e1e]/60 border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground select-none">
            <span className="flex items-center gap-1.5 font-bold">
              <Flame className="h-4.5 w-4.5 text-orange-500 fill-orange-500/10 shrink-0 animate-pulse" /> Day 25
            </span>
            <span>{timeLeft}</span>
          </div>

          {/* Calendar Grid for May 2026 */}
          <div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-[10px] font-mono text-muted-foreground/60 mb-2 select-none">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center font-mono text-xs select-none">
              {/* Empty cells before May 1st */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`empty-${i}`} className="h-7 w-7" />
              ))}
              {/* May days */}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const dateStr = `2026-05-${String(day).padStart(2, "0")}`;
                const isSolved = leetcodeSolvedDates.includes(dateStr);
                const isActiveDay = day === 25;

                return (
                  <div key={`day-${day}`} className="flex flex-col items-center justify-center relative">
                    <button
                      onClick={() => {
                        if (isSolved) {
                          toast.success(`Completed challenges on May ${day}, 2026!`);
                        } else if (isActiveDay) {
                          toast.info("Today's challenge is active! Click a problem on the right to maintain your streak.");
                        }
                      }}
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all relative cursor-pointer ${isSolved || (isActiveDay && leetcodeSolvedDates.includes("2026-05-25"))
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.35)]"
                        : isActiveDay
                          ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold animate-pulse"
                          : "text-slate-300 hover:bg-white/5"
                        }`}
                    >
                      {day}
                    </button>
                    {!isSolved && !isActiveDay && (
                      <span className="w-1 h-1 rounded-full bg-rose-500/60 absolute -bottom-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Premium Card */}
          <div className="bg-[#2a2a2a]/40 border border-white/5 rounded-xl p-3.5 space-y-2 select-none shadow-inner">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-[#f59e0b] font-semibold">Weekly Premium ⭐</span>
              <span className="text-muted-foreground/80">3 days left</span>
            </div>
            <div className="flex justify-between items-center gap-1.5 pt-1">
              {["W1", "W2", "W3", "W4", "W5"].map((w) => {
                const isCurrentWeek = w === "W4";
                return (
                  <div
                    key={w}
                    className={`flex-1 py-1.5 text-center rounded-md font-mono text-[9px] border font-bold ${isCurrentWeek
                      ? "bg-[#f59e0b] border-[#f59e0b] text-slate-950 shadow-md scale-102"
                      : "bg-white/5 border-white/5 text-muted-foreground"
                      }`}
                  >
                    {w}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex justify-between items-center border-t border-white/5 pt-3.5 text-[10px] font-mono select-none">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Zap className="h-3.5 w-3.5 fill-emerald-400/20 text-emerald-400" /> {currentStreak * 15 + leetcodeSolved.length * 10} Redeem
            </span>
            <button
              onClick={() => {
                toast.info(
                  "Rules: 1. Solve the daily problem or any DSA question to extend your streak. 2. Each correct solution awards +10 points. 3. Active streaks multiply points (+15 per day)!"
                );
              }}
              className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              Rules
            </button>
          </div>
        </div>

        {/* Global Leaderboard Ranking Panel */}
        <div className="bg-[#1e1e1e]/60 border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 select-none">
            <Trophy className="h-4.5 w-4.5 text-[#fbbf24] shrink-0" />
            <h3 className="font-mono text-xs uppercase tracking-wider text-slate-200">Global Leaderboard</h3>
          </div>

          <div className="space-y-2">
            {leaderboard.map((member, idx) => {
              const isTop3 = idx < 3;
              const medalColors = ["text-[#ffd700]", "text-[#c0c0c0]", "text-[#cd7f32]"];

              return (
                <div
                  key={member.name}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${member.isUser
                    ? "bg-emerald-500/10 border-emerald-500/30 text-white font-medium shadow-[0_0_12px_rgba(16,185,129,0.05)] scale-102"
                    : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/8"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-5 font-mono text-xs text-center font-bold ${isTop3 ? medalColors[idx] : "text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold flex items-center gap-1.5 select-text">
                        {member.name}
                        {member.isUser && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground/80 select-none">
                        {member.solved} solved · {member.streak}d streak
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-100 pr-1 select-text">
                    {member.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main DSA Question List Panel */}
      <main className="lg:col-span-8 flex flex-col gap-6 animate-fade-rise">
        {/* Filters and Search Bar */}
        <div className="liquid-glass rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center select-none">
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search problems..."
                className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 font-mono text-xs text-white placeholder-muted-foreground/40 outline-none focus:border-white/30 transition-all shadow-inner"
              />
            </div>

            {/* Category / Difficulty Filters */}
            <div className="flex gap-2 flex-wrap w-full md:w-auto">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="h-10 bg-[#1a1a1a] text-slate-200 border border-white/10 rounded-lg px-3 font-mono text-xs outline-none focus:border-white/30 cursor-pointer shadow-md"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Horizontal Topic Filter Capsules */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none select-none border-t border-white/5 pt-3.5 -mx-1 px-1">
            {["All", "Array", "String", "Hash Table", "Dynamic Programming", "Binary Search", "Stack", "Math"].map((topic) => {
              const isActive = selectedCategory === topic;
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedCategory(topic)}
                  className={`shrink-0 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all border font-semibold cursor-pointer ${isActive
                    ? "bg-white text-black border-white shadow-md scale-102"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20 hover:text-white"
                    }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question List Row Grid */}
        <div className="space-y-3">
          {leetcodeQuestionsLoading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="liquid-glass rounded-xl border border-white/10 p-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="h-5 w-5 rounded-full bg-white/5" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-white/5 rounded w-1/3" />
                    <div className="h-3 bg-white/5 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-6 bg-white/5 rounded w-12" />
              </div>
            ))
          ) : filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => {
              const isSolved = leetcodeSolved.includes(q.id);

              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestion(q)}
                  className="w-full text-left liquid-glass rounded-xl border border-white/10 hover:border-white/25 transition-all hover:scale-[1.01] hover:translate-x-1 p-4 shadow-md flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Status check icon */}
                    <div className="shrink-0 select-none">
                      {isSolved ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-fade-in" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-white/15 bg-white/5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-white leading-snug truncate font-sans">
                        {q.id}. {q.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 select-none">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                          {q.category}
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground/50 truncate">
                          Acceptance: {q.acceptance}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Badge */}
                  <div className="shrink-0 select-none">
                    <span className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.2 rounded-full border ${q.difficulty === "easy"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : q.difficulty === "medium"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      }`}>
                      {q.difficulty}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center font-mono text-xs text-muted-foreground py-16 liquid-glass rounded-xl border border-white/5 select-none shadow-inner">
              No challenges match your search filters. Clear them and try again!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
