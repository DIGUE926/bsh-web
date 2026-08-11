"use client";

import { usePathname, useRouter } from "next/navigation";

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/" || pathname === "/login") return null;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-3">
      <button
        onClick={() => router.back()}
        className="text-xs text-white/50 hover:text-bsh-orange transition-colors flex items-center gap-1"
      >
        ← Retour
      </button>
    </div>
  );
}
