import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { runCode } from "@/lib/video.functions";
import { Button } from "@/components/ui/button";
import {
  Play,
  CheckCircle2,
  Terminal,
  Code2,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type CodingChallenge = {
  title: string;
  description: string;
  starterCode: string;
  testRunnerCode: string;
  testCases: { input: string; expected: string; explanation: string }[];
  language: string;
};

type CodePlaygroundProps = {
  challenge: CodingChallenge;
  onPass: () => void;
  difficulty: string;
};

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
        <code key={index} className="bg-muted/40 border border-foreground/10 px-1.5 py-0.5 rounded text-[#38bdf8] font-mono text-[11px] select-all">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-3 font-mono text-sm leading-relaxed text-foreground select-text pb-6">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith("###")) {
          return (
            <h3 key={idx} className="font-display text-base font-bold mt-6 mb-2 text-foreground flex items-center gap-2 border-b border-foreground/15 pb-1">
              <span className="h-1.5 w-1.5 bg-[#fbbf24]" />
              {parseInlineMarkdown(trimmed.replace(/^###\s*/, ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("##")) {
          return (
            <h2 key={idx} className="font-display text-lg font-bold mt-8 mb-3 text-foreground flex items-center gap-2 border-b border-foreground/20 pb-1">
              <span className="h-2 w-2 bg-[#f59e0b]" />
              {parseInlineMarkdown(trimmed.replace(/^##\s*/, ""))}
            </h2>
          );
        }
        if (trimmed.startsWith("#")) {
          return (
            <h1 key={idx} className="font-display text-xl font-bold mt-8 mb-4 text-foreground border-b border-foreground/30 pb-2">
              {parseInlineMarkdown(trimmed.replace(/^#\s*/, ""))}
            </h1>
          );
        }

        // Unordered lists
        if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          return (
            <div key={idx} className="flex gap-2 pl-4 items-start py-0.5">
              <span className="text-[#fbbf24] shrink-0">•</span>
              <span className="flex-1">{parseInlineMarkdown(trimmed.substring(1).trim())}</span>
            </div>
          );
        }

        // Ordered lists
        const orderedMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
        if (orderedMatch) {
          return (
            <div key={idx} className="flex gap-2 pl-4 items-start py-0.5">
              <span className="font-bold text-muted-foreground shrink-0">{orderedMatch[1]}.</span>
              <span className="flex-1">{parseInlineMarkdown(orderedMatch[2])}</span>
            </div>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Plain paragraph
        return <p key={idx} className="py-0.5">{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

export function CodePlayground({ challenge, onPass, difficulty }: CodePlaygroundProps) {
  const runCodeFn = useServerFn(runCode);
  const [code, setCode] = useState(challenge.starterCode);
  const [activeTab, setActiveTab] = useState<"instructions" | "testcases">("instructions");
  const [running, setRunning] = useState<boolean>(false);
  const [runType, setRunType] = useState<"sandbox" | "tests" | null>(null);
  
  // Terminal logs state
  const [output, setOutput] = useState<string>("");
  const [stdout, setStdout] = useState<string>("");
  const [stderr, setStderr] = useState<string>("");
  const [passed, setPassed] = useState<boolean | null>(null);
  const [testReason, setTestReason] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync scroll of textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Generate line numbers
  const lineCount = code.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  // Reset editor code
  const handleReset = () => {
    if (confirm("Are you sure you want to reset the editor to the starter template?")) {
      setCode(challenge.starterCode);
      toast.info("Editor code reset.");
    }
  };

  const handleExecute = async (mode: "sandbox" | "tests") => {
    setRunning(true);
    setRunType(mode);
    setOutput("");
    setStdout("");
    setStderr("");
    setPassed(null);
    setTestReason("");

    // Prepare code payload
    // In "tests" mode, append the hidden testRunnerCode
    const codeToRun = mode === "tests"
      ? `${code}\n\n${challenge.testRunnerCode}`
      : code;

    try {
      const res = await runCodeFn({
        data: {
          language: challenge.language,
          code: codeToRun,
        },
      });

      if (!res.ok) {
        setOutput(`[System Error] ${res.error}`);
        toast.error(res.error || "Execution failed");
        return;
      }

      setStdout(res.stdout);
      setStderr(res.stderr);
      setOutput(res.output);

      if (mode === "tests") {
        const fullOutput = (res.stdout + "\n" + res.output + "\n" + res.stderr).trim();
        
        if (fullOutput.includes("__SUCCESS__")) {
          setPassed(true);
          toast.success("All test cases passed! Outstanding code.");
        } else {
          setPassed(false);
          // Try to extract failed reason
          const failedMatch = fullOutput.match(/__FAILED__:\s*(.*)/);
          const reason = failedMatch ? failedMatch[1] : "Output verification failed or test cases did not pass.";
          setTestReason(reason);
          toast.error("Some test cases failed.");
        }
      } else {
        toast.success("Sandbox code executed successfully.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setOutput(`[Execution Error] ${msg}`);
      toast.error(msg);
    } finally {
      setRunning(false);
      setRunType(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full lg:h-[calc(100vh-60px)] overflow-hidden">
      {/* Sleek Workspace Top Header (LeetCode/HackerRank Style) */}
      <div className="flex items-center justify-between border border-white/10 bg-[#040c18]/60 backdrop-blur-md px-6 py-3.5 rounded-2xl shadow-2xl font-mono text-xs text-foreground select-none shrink-0">
        <button
          onClick={() => {
            window.location.reload();
          }}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full text-foreground hover:scale-[1.03] transition-all cursor-pointer"
        >
          <span>← Back to Practice</span>
        </button>

        {/* Question Selector Pagination */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2 rounded-full">
          <span className="text-muted-foreground/60 select-none">&lt;</span>
          <span className="font-bold text-foreground">Challenge Q1</span>
          <span className="text-muted-foreground/60 select-none">&gt;</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-muted-foreground uppercase tracking-widest text-[9px] font-bold">Expert Certification</span>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid gap-5 lg:grid-cols-12 flex-1 w-full overflow-hidden">
        {/* LEFT COLUMN: Problem Specs */}
        <div className="lg:col-span-6 flex flex-col h-full overflow-hidden">
          <div className="border border-white/10 p-6 bg-[#040c18]/80 backdrop-blur-md flex flex-col h-full rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 select-none">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] border border-white/20 px-2.5 py-1 rounded bg-white/5 mr-2 font-bold text-muted-foreground">
                  Expert Code
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded capitalize font-bold">
                  {challenge.language}
                </span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Difficulty: {difficulty}
              </div>
            </div>

            <h2 className="font-display text-2xl font-bold tracking-tight mb-2 text-white">
              {challenge.title}
            </h2>

            {/* Sub Navigation */}
            <div className="flex border-b border-white/10 mt-2 mb-4 select-none">
              <button
                onClick={() => setActiveTab("instructions")}
                className={`font-mono text-xs uppercase tracking-wider px-4 py-2.5 border-b-2 border-transparent -mb-[1px] transition-all cursor-pointer ${
                  activeTab === "instructions"
                    ? "border-emerald-400 font-bold text-white"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab("testcases")}
                className={`font-mono text-xs uppercase tracking-wider px-4 py-2.5 border-b-2 border-transparent -mb-[1px] transition-all cursor-pointer ${
                  activeTab === "testcases"
                    ? "border-emerald-400 font-bold text-white"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                Test Cases ({challenge.testCases.length})
              </button>
            </div>

            {/* Tab Content (Scrolls independently) */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === "instructions" ? (
                <Markdown text={challenge.description} />
              ) : (
                <div className="space-y-4 pb-6">
                  {challenge.testCases.map((tc, idx) => (
                    <div key={idx} className="border border-white/10 p-4 font-mono text-xs rounded-xl bg-white/5">
                      <div className="font-bold text-muted-foreground uppercase mb-1.5 text-[10px] tracking-wider">
                        Test Case #{idx + 1}
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="bg-black/30 p-3 border border-white/5 rounded-lg overflow-hidden">
                          <div className="text-[9px] text-muted-foreground uppercase mb-1 font-bold tracking-wider">Input</div>
                          <code className="whitespace-pre-wrap break-words block text-slate-200">{tc.input}</code>
                        </div>
                        <div className="bg-black/30 p-3 border border-white/5 rounded-lg overflow-hidden">
                          <div className="text-[9px] text-muted-foreground uppercase mb-1 font-bold tracking-wider">Expected</div>
                          <code className="whitespace-pre-wrap break-words block text-emerald-400">{tc.expected}</code>
                        </div>
                      </div>
                      {tc.explanation && (
                        <div className="mt-3 text-muted-foreground leading-relaxed text-[13px]">
                          <span className="font-bold text-slate-300">Explanation:</span> {tc.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Code Editor & Runner */}
        <div className="lg:col-span-6 flex flex-col h-full gap-4 overflow-hidden">
          {/* Code Editor Container */}
          <div className="border border-white/10 bg-[#020712]/90 backdrop-blur-md flex flex-col flex-1 min-h-[300px] rounded-2xl shadow-2xl overflow-hidden">
            {/* Editor Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5 font-mono text-xs">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">solution.{challenge.language === "python" ? "py" : challenge.language === "javascript" ? "js" : "code"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest border border-emerald-500/20 rounded px-2.5 py-0.5 bg-emerald-500/5 font-bold">
                  {challenge.language}
                </span>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 hover:text-red-400 font-mono transition-colors text-muted-foreground cursor-pointer"
                  title="Reset starter template"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset template</span>
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden relative bg-black/25">
              {/* Line Numbers Column */}
              <div
                ref={lineNumbersRef}
                className="w-12 bg-black/10 border-r border-white/5 text-muted-foreground/30 font-mono text-xs text-right pr-3.5 py-4 select-none overflow-hidden"
                style={{ lineHeight: "22px" }}
              >
                {lineNumbers.map((num) => (
                  <div key={num}>{num}</div>
                ))}
              </div>

              {/* Textarea Code Input */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={handleScroll}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className="flex-1 bg-transparent text-[#6ee7b7] font-mono text-xs p-4 focus:outline-none resize-none overflow-auto whitespace-pre leading-[22px]"
                style={{
                  tabSize: 4,
                  WebkitTextFillColor: "inherit",
                }}
              />
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex gap-3 shrink-0 select-none">
            <button
              onClick={() => handleExecute("sandbox")}
              disabled={running}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-foreground py-4 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {running && runType === "sandbox" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 text-sky-400" />
              )}
              <span>Run Sandbox Code</span>
            </button>

            <button
              onClick={() => handleExecute("tests")}
              disabled={running}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border-none"
            >
              {running && runType === "tests" ? (
                <Loader2 className="h-4 w-4 animate-spin text-black" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-black" />
              )}
              <span>Compile & Run Tests</span>
            </button>
          </div>

          {/* Console / Output Window */}
          <div className="border border-white/10 bg-[#02050b]/95 backdrop-blur-md text-white p-5 flex flex-col h-[230px] rounded-2xl font-mono text-xs overflow-hidden shrink-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                <Terminal className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>Terminal Output</span>
              </div>
              {passed === true && (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-bold uppercase text-[9px] tracking-wider rounded">
                  TESTS PASSED
                </span>
              )}
              {passed === false && (
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 font-bold uppercase text-[9px] tracking-wider rounded">
                  TESTS FAILED
                </span>
              )}
            </div>

            {/* Log Window */}
            <div className="flex-1 overflow-y-auto space-y-2 select-text font-mono text-xs pr-1">
              {running ? (
                <div className="text-muted-foreground flex items-center gap-2 animate-pulse mt-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Compiling and running code in a secure sandbox...</span>
                </div>
              ) : stdout || stderr || output || passed !== null ? (
                <div className="space-y-3">
                  {/* Custom system output for test failures */}
                  {passed === false && (
                    <div className="bg-rose-950/20 border border-rose-800/30 text-rose-400 p-2.5 flex items-start gap-2 rounded-xl">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <span className="font-bold">Assertion Failure: </span>
                        {testReason}
                      </div>
                    </div>
                  )}

                  {passed === true && (
                    <div className="bg-emerald-950/20 border border-emerald-800/30 text-emerald-400 p-2.5 flex items-start gap-2 rounded-xl">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                      <div>
                        <span className="font-bold">Challenge Completed Successfully!</span>
                        <p className="mt-1 text-[11px] text-emerald-300/80 leading-relaxed">
                          Your solution compiles correctly, manages edge cases, and satisfies all hidden test assertions. Click the button below to submit and claim your expert certificate!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Stderr logs */}
                  {stderr && (
                    <div className="text-rose-400 font-bold whitespace-pre-wrap bg-rose-950/10 p-2 border border-rose-900/10 rounded">
                      [STDERR] {stderr}
                    </div>
                  )}

                  {/* Stdout logs */}
                  {stdout && (
                    <div className="text-slate-300 whitespace-pre-wrap bg-slate-900/20 p-2 border border-slate-800/15 rounded">
                      [STDOUT] {stdout}
                    </div>
                  )}

                  {/* Complete general execution output */}
                  {output && !stdout && !stderr && (
                    <div className="text-slate-300 whitespace-pre-wrap bg-slate-900/20 p-2 border border-slate-800/15 rounded">
                      {output}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground/50 italic mt-1">
                  Terminal idle. Click "Run Sandbox Code" or "Compile & Run Tests" to execute your solution.
                </div>
              )}
            </div>

            {/* Submit Claim Trigger when tests passed */}
            {passed === true && !running && (
              <div className="mt-3 pt-3 border-t border-white/10 animate-bounce shrink-0">
                <Button
                  onClick={onPass}
                  className="w-full bg-emerald-400 text-black hover:bg-emerald-300 font-mono text-xs uppercase tracking-wider py-4 rounded-xl font-bold border-none transition-all cursor-pointer"
                >
                  Claim Certified Completion →
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
