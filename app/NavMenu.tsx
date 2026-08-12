"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type League = { name: string; slug: string };

export default function NavMenu({ leagues }: { leagues: League[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="border-b border-white/10 bg-bsh-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between relative">
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="font-display text-lg text-bsh-orange tracking-wide flex items-center gap-2"
          >
            BSH
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path
                d="M2 4L7 9L12 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {open && (
            <div className="absolute left-0 top-full mt-2 w-[85vw] max-w-64 bg-bsh-black border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-[80vh] overflow-y-auto">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 hover:bg-white/5 font-semibold border-b border-white/10"
              >
                Accueil
              </Link>

              {leagues.map((league) => (
                <div key={league.slug} className="border-b border-white/5">
                  <p className="px-4 pt-3 pb-1 text-xs uppercase text-white/40 tracking-wide">
                    {league.name}
                  </p>
                  <Link
                    href={`/${league.slug}`}
                    onClick={() => setOpen(false)}
                    className="block px-6 py-2 text-sm hover:bg-white/5"
                  >
                    Équipes
                  </Link>
                  <Link
                    href={`/${league.slug}/matchs`}
                    onClick={() => setOpen(false)}
                    className="block px-6 py-2 text-sm hover:bg-white/5"
                  >
                    Matchs
                  </Link>
                  <Link
                    href={`/${league.slug}/classement`}
                    onClick={() => setOpen(false)}
                    className="block px-6 py-2 text-sm hover:bg-white/5"
                  >
                    Classement
                  </Link>
                </div>
              ))}

              <Link
                href="/classement"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 hover:bg-white/5 font-semibold border-b border-white/10"
              >
a
                href="https://www.instagram.com/ballsohardx2/?__pwa=1"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 text-sm text-white/60 border-b border-white/10"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                @ballsohardx2
              </a>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-white/50 hover:bg-white/5 text-sm"
              >
                Connexion
              </Link>
            </div>
          )}
        </div>

        <div className="hidden sm:flex gap-6 text-sm font-semibold">
          <Link href="/suble" className="hover:text-bsh-orange transition-colors">
            SUBLE
          </Link>
          <Link href="/classement" className="hover:text-bsh-orange transition-colors">
            Classement SUBLE
          </Link>
        </div>
      </div>
    </nav>
  );
}
