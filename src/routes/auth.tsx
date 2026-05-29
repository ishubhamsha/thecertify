import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        nav({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen max-h-screen relative overflow-hidden flex flex-col font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      {/* Fullscreen Starry Sky Background */}
      <div className="absolute inset-0 w-full h-full starry-bg z-0 pointer-events-none" />

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
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-md px-6 py-16 flex-1 w-full overflow-y-auto">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {mode === "signin" ? "Welcome back" : "Create account"}
        </div>
        <h1 className="mt-3 font-display text-5xl font-bold tracking-tight">
          {mode === "signin" ? "Sign in." : "Sign up."}
        </h1>

        <form onSubmit={onSubmit} className="mt-10 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.2em]">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-2 h-12 rounded-none border-2 border-foreground bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          )}
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.2em]">Email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 h-12 rounded-none border-2 border-foreground bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-[0.2em]">Password</label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-2 h-12 rounded-none border-2 border-foreground bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-none font-mono text-sm uppercase tracking-wide"
          >
            {busy ? "Working…" : mode === "signin" ? "Sign in →" : "Create account →"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 font-mono text-xs uppercase tracking-[0.2em] underline"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 relative z-10 w-full mt-auto">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground select-none">
          <span>Certify® © 2026</span>
          <span>v1.2</span>
        </div>
      </footer>
    </div>
  );
}
