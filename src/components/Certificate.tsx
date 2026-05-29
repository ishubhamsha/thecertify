import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type Props = {
  name: string;
  videoTitle: string;
  difficulty: string;
  score: number;
  total: number;
  date: string;
  certId: string;
};

export function Certificate(props: Props) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Outfit:wght@600;800&family=IBM+Plex+Sans:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const pct = Math.round((props.score / props.total) * 100);

  const getLinkedInShareUrl = () => {
    if (typeof window === "undefined") return "";
    
    const name = encodeURIComponent(`Certificate of Completion in ${props.videoTitle} (${props.difficulty} Level)`);
    const organizationName = encodeURIComponent("thecertify");
    const certId = encodeURIComponent(props.certId);
    
    // Auto-verify URL pointing directly to the live production verify page
    const certUrl = encodeURIComponent(`https://thecertify.qzz.io/verify?id=${props.certId}`);
    
    const today = new Date();
    const issueMonth = today.getMonth() + 1; // 1-indexed
    const issueYear = today.getFullYear();

    return `https://www.linkedin.com/profile/add?startTask=CERTIFICATION&name=${name}&organizationName=${organizationName}&issueMonth=${issueMonth}&issueYear=${issueYear}&certId=${certId}&certUrl=${certUrl}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/" className="font-mono text-xs uppercase underline">
          ← New certification
        </Link>
        <div className="flex items-center gap-3">
          <a
            href={getLinkedInShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#0077b5] hover:bg-[#0077b5]/90 text-white font-mono text-xs uppercase tracking-wider font-semibold py-2.5 px-5 rounded-md shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
            Add to LinkedIn
          </a>
          <Button onClick={() => window.print()} className="font-mono uppercase tracking-wide">
            Download / Print
          </Button>
        </div>
      </div>

      <div
        id="cert"
        className="relative mx-auto aspect-[1.414/1] w-full max-w-5xl bg-[#fcfbf9] text-[#0f2e42] p-12 shadow-2xl rounded-lg overflow-hidden border border-amber-800/10 print:border-0 print:shadow-none print:rounded-none select-none"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(197, 168, 128, 0.05)"
        }}
      >
        {/* Outermost elegant gold double-border */}
        <div className="absolute inset-5 border border-[#c5a880] opacity-80" />
        <div className="absolute inset-7 border border-[#c5a880]/30" />

        {/* Elegant Gold Corner Ornaments */}
        <div className="absolute top-6 left-6 size-8 border-t-2 border-l-2 border-[#c5a880] rounded-tl-sm" />
        <div className="absolute top-6 right-6 size-8 border-t-2 border-r-2 border-[#c5a880] rounded-tr-sm" />
        <div className="absolute bottom-6 left-6 size-8 border-b-2 border-l-2 border-[#c5a880] rounded-bl-sm" />
        <div className="absolute bottom-6 right-6 size-8 border-b-2 border-r-2 border-[#c5a880] rounded-br-sm" />

        <div className="relative flex h-full flex-col justify-between p-6">
          {/* Certificate Header */}
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
            <div className="flex items-center gap-2">
              <div className="text-xl tracking-tight text-[#0f2e42] font-semibold animate-fade-rise" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Certify<sup className="text-[10px]">®</sup>
              </div>
              <div className="h-4 w-px bg-amber-900/20" />
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#c5a880] font-bold">
                Academic Credential
              </div>
            </div>
            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500 text-right leading-relaxed select-text">
              Verification ID · <span className="font-semibold text-slate-700">{props.certId}</span>
            </div>
          </div>

          {/* Certificate Main Content */}
          <div className="my-auto space-y-6 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-[#c5a880] font-bold">
              Certificate of Completion
            </div>
            
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-mono">This is proudly presented to</p>
              <h1 
                className="text-4xl md:text-5xl lg:text-6xl text-[#0d3852] font-normal italic tracking-tight py-2 select-text"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {props.name}
              </h1>
              <div className="mx-auto h-[1.5px] w-48 bg-gradient-to-r from-transparent via-[#c5a880] to-transparent" />
            </div>

            <div className="space-y-3">
              <p className="mx-auto max-w-2xl text-xs md:text-sm text-slate-600 font-sans leading-relaxed select-text">
                for successfully achieving passing grades and demonstrating proficiency in the{" "}
                <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-[#c5a880]/10 text-amber-900 text-[10px] font-bold tracking-wider">{props.difficulty}</span> level curriculum of
              </p>
              
              <h2 
                className="mx-auto max-w-3xl text-xl md:text-2xl lg:text-3xl text-[#0f2e42] leading-tight font-normal select-text"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                "{props.videoTitle}"
              </h2>
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-mono">
                An AI-Assessed Technical Syllabus on the Certify Education Network
              </p>
            </div>
          </div>

          {/* Certificate Footer / Signatures & Seal */}
          <div className="grid grid-cols-12 gap-4 border-t border-amber-900/10 pt-6 items-end select-none">
            {/* Left signature field */}
            <div className="col-span-4 text-left font-mono text-[8px] uppercase tracking-wider text-slate-500">
              <div className="h-10 flex items-center pl-2">
                <span 
                  className="text-lg text-emerald-800/80 tracking-wide font-normal italic" 
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Certify AI Core
                </span>
              </div>
              <div className="border-t border-slate-300 pt-1.5 pl-2 font-bold text-[#0d3852]">
                Verification Authority
              </div>
            </div>

            {/* Center Gold Seal */}
            <div className="col-span-4 flex justify-center">
              <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-yellow-600/50 shadow-md">
                <div className="absolute inset-1.5 rounded-full border border-dashed border-white/40" />
                <div className="text-center text-[7px] uppercase tracking-wider text-yellow-950 font-bold leading-none select-none font-mono">
                  Certify
                  <br />
                  <span className="text-[5px] text-yellow-900/70">Verified</span>
                  <br />
                  <span className="text-[8px]">★</span>
                </div>
                {/* Ribbon tails hanging from the seal */}
                <div className="absolute -bottom-4 left-1/3 w-2.5 h-6 bg-amber-600/80 rounded-b-sm border-r border-amber-700/30 transform -rotate-12 z-[-1]" />
                <div className="absolute -bottom-4 right-1/3 w-2.5 h-6 bg-amber-600 rounded-b-sm border-l border-amber-700/30 transform rotate-12 z-[-1]" />
              </div>
            </div>

            {/* Right signature field */}
            <div className="col-span-4 text-right font-mono text-[8px] uppercase tracking-wider text-slate-500">
              <div className="h-10 flex items-end justify-end pr-2">
                <span className="font-semibold text-slate-700 pb-1 text-[9px]">
                  {pct}% PASS · {props.date}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-1.5 pr-2 font-bold text-[#0d3852]">
                Academic Board Director
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: #fcfbf9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #cert, #cert * {
            visibility: visible;
          }
          #cert {
            position: absolute;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 92% !important;
            max-width: 92% !important;
            height: auto !important;
            aspect-ratio: 1.414/1 !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            background-color: #fcfbf9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
