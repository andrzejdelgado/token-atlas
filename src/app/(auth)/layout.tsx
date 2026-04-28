import type React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {children}
      <p className="text-muted-foreground text-center text-xs">
        By clicking continue, you agree to our{" "}
        <a
          href="#"
          className="hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="#"
          className="hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
