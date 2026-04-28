import type React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 p-6">
      {children}
      <p className="text-center text-xs text-zinc-500">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline transition-colors hover:text-zinc-300">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline transition-colors hover:text-zinc-300">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
