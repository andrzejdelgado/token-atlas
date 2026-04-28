"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password");
    } else {
      router.push("/");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="flex w-full max-w-4xl overflow-hidden rounded-xl border border-zinc-800 shadow-2xl">
      {/* Left: form */}
      <div className="flex flex-1 flex-col justify-center gap-6 bg-zinc-900 p-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-sm text-zinc-400">Login to your Token Atlas account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm text-zinc-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm text-zinc-300">
                Password
              </Label>
              <Link
                href="#"
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Forgot your password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="border-zinc-700 bg-zinc-800 text-white focus-visible:ring-zinc-500"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <Separator className="flex-1 bg-zinc-700" />
          <span className="text-xs text-zinc-500">Or continue with</span>
          <Separator className="flex-1 bg-zinc-700" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Apple — not configured */}
          <Button
            variant="outline"
            className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"
            disabled
            title="Apple login not configured"
          >
            <svg className="h-4 w-4" viewBox="0 0 814 1000" fill="currentColor">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-161.1-39.5c-74.1 0-102.3 41.5-161.5 41.5s-103.7-62.9-152.3-127.6C58.5 728.7 0 593.1 0 464.5c0-218.8 128.4-329.8 256.6-329.8 72.5 0 132.7 43.3 188.1 43.3 53.2 0 121.9-45.7 202.5-45.7 28.6 0 130.3 2.6 198.4 103zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
            </svg>
          </Button>

          {/* Google — configured */}
          <Button
            variant="outline"
            className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
          </Button>

          {/* Meta — not configured */}
          <Button
            variant="outline"
            className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"
            disabled
            title="Meta login not configured"
          >
            <svg className="h-4 w-4" viewBox="0 0 36 36" fill="currentColor">
              <path d="M18 2C9.163 2 2 9.163 2 18s7.163 16 16 16 16-7.163 16-16S26.837 2 18 2zm7.3 10.5c-.8 0-1.6.4-2.3 1.1l-5 6.5-5-6.5c-.7-.7-1.5-1.1-2.3-1.1-1.6 0-2.7 1.3-2.7 3.1 0 .8.2 1.6.7 2.3l6.5 8.5c.4.5.9.8 1.5.9h2.6c.6-.1 1.1-.4 1.5-.9l6.5-8.5c.5-.7.7-1.5.7-2.3.1-1.8-1-3.1-2.7-3.1z" />
            </svg>
          </Button>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-zinc-300 transition-colors hover:text-white hover:underline"
          >
            Sign up
          </Link>
        </p>

        <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 p-3 text-center">
          <p className="mb-1 text-xs font-medium text-zinc-400">Demo account</p>
          <button
            type="button"
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-200 hover:underline"
            onClick={() => {
              setEmail("demo@tokenatlas.com");
              setPassword("demo");
            }}
          >
            demo@tokenatlas.com · password: demo
          </button>
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="hidden flex-1 items-center justify-center bg-zinc-800 lg:flex">
        <div className="flex flex-col items-center gap-3 select-none">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-700">
            <svg
              className="h-8 w-8 text-zinc-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-zinc-300">Token Atlas</span>
          <p className="text-xs text-zinc-500">Design token management</p>
        </div>
      </div>
    </div>
  );
}
