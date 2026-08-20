"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import U20Badge from "./U20Badge";

type League = { name: string; slug: string; logo_url?: string | null };

export default function NavMenu({ leagues }: { leagues: League[] }) {
  const [open, setOpen] = useState(false);
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function closeMenu() {
    setOpen(false);
    setExpandedLeague(null);
  }

  return (
    <nav className="border-b border-white/10 bg-bsh-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between relative">
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="font-display text-base sm:text-lg text-bsh-orange tracking-wide flex items-center gap-1.5 sm:gap-2"
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
            <div className="absolute left-0 top-full mt-1.5 sm:mt-2 w-[62vw] max-w-48 sm:w-[75vw] sm:max-w-56 bg-bsh-black border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-[80vh] overflow-y-auto">
              <div className="py-1">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="block px-3 py-2 hover:bg-white/5 font-semibold text-xs"
                >
                  Accueil
                </Link>
                <Link
                  href="/live"
                  onClick={closeMenu}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 font-semibold text-xs text-red-400"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Scoreboard Live
                </Link>
              </div>

              <div className="border-t border-white/10">
                <p className="px-3 pt-2 pb-0.5 text-[9px] uppercase tracking-widest text-white/30 font-semibold">
                  Ligues
                </p>
                {leagues.map((league) => {
                  const isExpanded = expandedLeague === league.slug;
                  return (
                  <div key={league.slug} className="border-b border-white/5 last:border-b-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedLeague(isExpanded ? null : league.slug)
                      }
                      className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-white/5"
                    >
                      <Avatar
                        name={league.name}
                        src={league.logo_url}
                        size={16}
                        rounded="rounded"
                      />
                      <p className="text-xs font-semibold text-white/90 truncate flex-1 text-left flex items-center gap-1.5">
                        {league.name}
                        <U20Badge slug={league.slug} />
                      </p>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 14 14"
                        fill="none"
                        className={`shrink-0 text-white/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                    {isExpanded && (
                    <div className="grid grid-cols-2 gap-x-1 px-3 pb-2">
                      <Link
                        href={`/${league.slug}`}
                        onClick={closeMenu}
                        className="block px-1.5 py-1 text-[11px] text-white/60 hover:text-bsh-orange rounded"
                      >
                        Équipes
                      </Link>
                      <Link
                        href={`/${league.slug}/matchs`}
                        onClick={closeMenu}
                        className="block px-1.5 py-1 text-[11px] text-white/60 hover:text-bsh-orange rounded"
                      >
                        Matchs
                      </Link>
                      <Link
                        href={`/${league.slug}/archives`}
                        onClick={closeMenu}
                        className="block px-1.5 py-1 text-[11px] text-white/60 hover:text-bsh-orange rounded"
                      >
                        Archives
                      </Link>
                      {league.slug !== "ahbb" && (
                        <Link
                          href={`/${league.slug}/classement`}
                          onClick={closeMenu}
                          className="block px-1.5 py-1 text-[11px] text-white/60 hover:text-bsh-orange rounded"
                        >
                          Classement équipes
                        </Link>
                      )}
                      <Link
                        href={`/${league.slug}/classement-joueurs`}
                        onClick={closeMenu}
                        className="block px-1.5 py-1 text-[11px] text-white/60 hover:text-bsh-orange rounded"
                      >
                        Classement joueurs
                      </Link>
                      <Link
                        href={`/${league.slug}/playoffs`}
                        onClick={closeMenu}
                        className="block px-1.5 py-1 text-[11px] text-white/60 hover:text-bsh-orange rounded"
                      >
                        Playoffs
                      </Link>
                    </div>
                    )}
                  </div>
                  );
                })}
              </div>

              <div className="border-t border-white/10 py-1">
                <a
                  href="https://www.instagram.com/ballsohardx2/?__pwa=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-xs text-white/60"
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
              </div>

              <div className="border-t border-white/10 py-1">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex items-center gap-2 px-3 py-2 text-white/35 hover:bg-white/5 hover:text-white/60 text-[11px]"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  Espace admin
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="hidden sm:flex gap-6 text-sm font-semibold items-center">
          <Link href="/live" className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Scoreboard Live
          </Link>
          {leagues.map((league) => (
            <Link
              key={league.slug}
              href={`/${league.slug}`}
              className="flex items-center gap-1.5 hover:text-bsh-orange transition-colors"
            >
              <Avatar name={league.name} src={league.logo_url} size={18} rounded="rounded" />
              {league.slug.toUpperCase()}
              <U20Badge slug={league.slug} />
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
