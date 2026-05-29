import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { listCertificates, deleteCertificate } from "@/lib/certificates.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const listFn = useServerFn(listCertificates);
  const delFn = useServerFn(deleteCertificate);
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const { data, isLoading } = useQuery({
    queryKey: ["certificates"],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Certificate removed.");
      qc.invalidateQueries({ queryKey: ["certificates"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const certs = data?.certificates ?? [];
  const totalScore = certs.reduce((a, c: any) => a + c.score, 0);
  const totalQuestions = certs.reduce((a, c: any) => a + c.total_questions, 0);
  const avgPct = totalQuestions ? Math.round((totalScore / totalQuestions) * 100) : 0;

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

          {/* Nav Links */}
          <div className="flex items-center gap-6">
            <Link
              to="/verify"
              search={{ id: "" }}
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-white transition-colors"
            >
              Verify Cert
            </Link>
            <Link
              to="/"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-white transition-colors"
            >
              + New Certification
            </Link>
            <span className="hidden md:inline text-xs uppercase tracking-wider text-muted-foreground/60 select-none">
              {user?.email}
            </span>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                nav({ to: "/auth" });
              }}
              className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] transition-all cursor-pointer font-semibold"
            >
              Sign Out
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-8 py-10 space-y-10 overflow-y-auto">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between animate-fade-rise">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold mb-2 select-none">
              Dashboard
            </div>
            <h1 className="text-4xl md:text-5xl font-normal text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Your certifications
            </h1>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const id = String(fd.get("id") || "").trim();
              if (id) nav({ to: "/verify", search: { id } });
            }}
            className="flex w-full max-w-md gap-3 select-none"
          >
            <input
              name="id"
              placeholder="Search by certificate ID…"
              className="h-10 flex-1 border border-white/10 bg-white/5 rounded-full px-5 font-mono text-xs text-white placeholder-muted-foreground/45 outline-none focus:border-white/30 transition-all"
            />
            <button
              type="submit"
              className="h-10 rounded-full bg-white text-black font-semibold text-xs px-6 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Verify →
            </button>
          </form>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 divide-x divide-white/10 border border-white/10 liquid-glass rounded-2xl overflow-hidden shadow-xl select-none animate-fade-rise">
          <Stat label="Courses" value={String(certs.length)} />
          <Stat label="Avg score" value={`${avgPct}%`} />
          <Stat
            label="Passed"
            value={String(
              certs.filter((c: any) => c.score / c.total_questions >= 0.7).length,
            )}
          />
        </div>

        {/* Certificates Section */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : certs.length === 0 ? (
          <div className="border border-dashed border-white/20 p-12 text-center rounded-2xl liquid-glass animate-fade-rise">
            <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground select-none">
              No certificates earned yet
            </p>
            <Link to="/">
              <button type="button" className="mt-6 h-12 rounded-full px-8 bg-white text-black font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all text-sm uppercase tracking-wide cursor-pointer">
                Earn your first →
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 animate-fade-rise">
            {certs.map((c: any) => {
              const pct = Math.round((c.score / c.total_questions) * 100);
              const passed = pct >= 70;
              return (
                <div
                  key={c.id}
                  className="liquid-glass rounded-2xl p-5 border border-white/10 shadow-md hover:scale-[1.01] hover:border-white/20 transition-all flex flex-col justify-between h-fit"
                >
                  <div className="flex items-start gap-4">
                    {c.thumbnail_url ? (
                      <img
                        src={c.thumbnail_url}
                        alt=""
                        className="h-20 w-32 shrink-0 border border-white/10 object-cover rounded-xl shadow-sm"
                      />
                    ) : (
                      <div className="h-20 w-32 shrink-0 border border-white/10 bg-white/5 rounded-xl flex items-center justify-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground select-none">
                        No Thumb
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-base font-normal leading-snug text-white select-text" style={{ fontFamily: "'Instrument Serif', serif" }}>
                        {c.video_title}
                      </h3>
                      {c.channel && (
                        <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground select-text">
                          {c.channel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 font-mono text-[9px] uppercase tracking-[0.2em] select-none">
                    <div>
                      <div className="text-muted-foreground">Score</div>
                      <div className="mt-1 text-xs text-white">
                        {c.score}/{c.total_questions}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Result</div>
                      <div className={`mt-1 text-xs ${passed ? "text-emerald-400 font-semibold" : "text-rose-400"}`}>
                        {pct}% {passed ? "PASS" : "FAIL"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Level</div>
                      <div className="mt-1 text-xs text-white capitalize">{c.difficulty}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 text-[9px] font-mono uppercase tracking-[0.2em] border-t border-white/5 pt-3 select-none">
                    <span className="text-muted-foreground/60">
                      {new Date(c.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        to="/verify"
                        search={{ id: c.id }}
                        className="underline text-slate-300 hover:text-white transition-colors"
                      >
                        View →
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Delete this certificate?")) del.mutate(c.id);
                        }}
                        className="underline text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground select-none">
        {label}
      </div>
      <div className="mt-2 text-4xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>{value}</div>
    </div>
  );
}
