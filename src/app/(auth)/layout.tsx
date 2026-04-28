import type React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {children}
      <p className="text-muted-foreground text-center text-xs">
        Created with ❤️ by{" "}
        <a
          href="https://www.linkedin.com/in/andrzejdelgado/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Andrzej Delgado
        </a>
      </p>
    </div>
  );
}
