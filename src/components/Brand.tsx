import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import * as React from "react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <Link to="/" className="inline-flex items-center gap-2 group" aria-label="KnowEm home">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-romance shadow-glow-purple">
        <Heart className="h-4 w-4 text-white" fill="currentColor" />
      </span>
      <span className={`font-display font-semibold ${s} text-charcoal`}>
        Know<span className="text-gradient-romance">Em</span>
      </span>
    </Link>
  );
}

export function PageBackdrop({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-app-v2">{children}</div>;
}
