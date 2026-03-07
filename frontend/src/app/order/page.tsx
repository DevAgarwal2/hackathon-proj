"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RESTAURANT_NAMES } from "@/lib/supabase";

const restaurants = Object.entries(RESTAURANT_NAMES).sort((a, b) =>
  a[1].localeCompare(b[1]),
);

export default function OrderLandingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");
  const [search, setSearch] = useState("");

  const filtered = search
    ? restaurants.filter(([, name]) =>
        name.toLowerCase().includes(search.toLowerCase()),
      )
    : restaurants;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] selection:bg-orange-500/30">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-12 sm:py-20">
        {/* Brand */}
        <div className="mb-10">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#666]">
            RevCopilot
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Order by voice
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#888]">
            Pick a restaurant below, then talk to our AI to place your order.
            <br />
            Works in Hindi, English, and Hinglish.
          </p>
        </div>

        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants..."
            className="w-full border-b border-[#222] bg-transparent py-2.5 text-sm text-white placeholder-[#555] outline-none transition-colors focus:border-[#444]"
          />
        </div>

        {/* Restaurant list */}
        <div className="flex-1">
          <div className="flex flex-col">
            {filtered.map(([id, name]) => (
              <button
                key={id}
                onClick={() => setSelected(id === selected ? "" : id)}
                className={`group flex items-center justify-between border-b border-[#161616] px-1 py-3.5 text-left transition-colors ${
                  selected === id
                    ? "bg-[#111]"
                    : "hover:bg-[#0e0e0e]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-semibold transition-colors ${
                      selected === id
                        ? "bg-orange-500 text-black"
                        : "bg-[#1a1a1a] text-[#666] group-hover:text-[#999]"
                    }`}
                  >
                    {name.charAt(0)}
                  </span>
                  <div>
                    <span
                      className={`text-sm font-medium transition-colors ${
                        selected === id ? "text-white" : "text-[#ccc] group-hover:text-white"
                      }`}
                    >
                      {name}
                    </span>
                    <span className="ml-2 text-xs text-[#444]">{id}</span>
                  </div>
                </div>
                {selected === id && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-orange-500"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-[#444]">
                No restaurants match &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 mt-6 border-t border-[#1a1a1a] bg-[#0a0a0a] pt-5 pb-2">
          <button
            disabled={!selected}
            onClick={() => router.push(`/order/${selected}`)}
            className={`w-full py-3 text-sm font-semibold tracking-wide transition-all ${
              selected
                ? "bg-orange-500 text-black hover:bg-orange-400 active:scale-[0.98]"
                : "bg-[#1a1a1a] text-[#444] cursor-not-allowed"
            }`}
          >
            {selected
              ? `Start ordering from ${RESTAURANT_NAMES[selected]}`
              : "Select a restaurant to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
