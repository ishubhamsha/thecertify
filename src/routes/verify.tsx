import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getCertificateById } from "@/lib/certificates.functions";
import { Certificate } from "@/components/Certificate";

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : "",
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const fetchFn = useServerFn(getCertificateById);
  const [id, setId] = useState(search.id ?? "");
  const [loading, setLoading] = useState(false);
  const [cert, setCert] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function lookup(certId: string) {
    setLoading(true);
    setErr(null);
    setCert(null);
    try {
      const { certificate } = await fetchFn({ data: { id: certId } });
      setCert(certificate);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Not found";
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (search.id && search.id.trim()) {
      setId(search.id.trim());
      void lookup(search.id.trim());
    }
  }, [search.id]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id.trim()) return;
    nav({ search: { id: id.trim() } });
    lookup(id.trim());
  }

  return (
    <div className="h-screen max-h-screen relative overflow-hidden flex flex-col font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      {/* Fullscreen Starry Sky Background */}
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4"
      />
      <div className="absolute inset-0 w-full h-full bg-black/60 z-0 pointer-events-none" />

      {/* Glassmorphic Navigation Bar */}
      <header className="relative z-10 w-full">
        <nav className="flex flex-row justify-between items-center px-8 py-6 max-w-7xl mx-auto">
          {/* Logo */}
          <Link
            to="/"
            className="text-3xl tracking-tight text-foreground hover:opacity-90 transition-opacity font-normal select-none cursor-pointer"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Certify<sup className="text-xs">®</sup>
          </Link>
          <Link
            to="/dashboard"
            className="font-mono text-[10px] uppercase tracking-[0.3em] underline text-foreground/80 hover:text-foreground"
          >
            Dashboard →
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-12 space-y-8 flex-1 w-full overflow-y-auto">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
            Public verifier
          </div>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight">
            Verify a certificate.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Paste a certificate ID to confirm its authenticity. Anyone can verify
            — no account needed.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 relative z-10 select-none">
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. 3f2c1a9d-2e4b-4b6a-9e5d-..."
            className="h-12 flex-1 rounded-full border border-white/10 bg-white/5 px-6 font-mono text-sm text-white placeholder-muted-foreground/45 outline-none focus:border-white/30 focus:ring-2 focus:ring-white/5 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !id.trim()}
            className="h-12 rounded-full px-8 bg-white text-black hover:scale-[1.02] active:scale-[0.98] font-mono text-xs uppercase tracking-wide font-semibold transition-all border-none shrink-0 cursor-pointer disabled:opacity-50 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed"
          >
            {loading ? "Checking…" : "Verify →"}
          </button>
        </form>

        {loading && <Skeleton className="h-96 rounded-2xl bg-white/5" />}

        {err && !loading && (
          <div className="border border-destructive/20 bg-destructive/10 p-6 rounded-2xl liquid-glass animate-fade-rise">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-rose-400 font-bold">
              Invalid Certificate ID
            </div>
            <p className="mt-2 text-sm text-slate-300 select-text">{err}</p>
          </div>
        )}

        {cert && !loading && (
          <div className="space-y-6 animate-fade-rise">
            <div className="border border-emerald-500/20 bg-emerald-500/10 p-4 rounded-xl liquid-glass font-mono text-xs uppercase tracking-[0.25em] text-emerald-400 font-bold">
              ✓ Verified Authenticity — Issued{" "}
              {new Date(cert.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </div>
            <Certificate
              name={cert.recipient_name}
              videoTitle={cert.video_title}
              difficulty={cert.difficulty}
              score={cert.score}
              total={cert.total_questions}
              date={new Date(cert.created_at).toLocaleDateString()}
              certId={cert.id}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 relative z-10 w-full mt-auto">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground select-none">
          <span>Certify® © 2026</span>
          <span>1.2</span>
        </div>
      </footer>
    </div>
  );
}
