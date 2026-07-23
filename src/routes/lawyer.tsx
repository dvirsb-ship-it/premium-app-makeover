import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Calendar, ChevronDown, MoreHorizontal } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { useAppStore } from "../lib/store";
import injuryImg from "../assets/categories/personal-injury.jpg";
import employmentImg from "../assets/categories/employment.jpg";
import realEstateImg from "../assets/categories/real-estate.jpg";
import civilImg from "../assets/categories/civil.jpg";

export const Route = createFileRoute("/lawyer")({
  component: LawyerFeed,
});

const CATEGORY_IMAGE: Record<string, string> = {
  "דיני עבודה": employmentImg,
  נזיקין: injuryImg,
  "נזיקין ותאונות דרכים": injuryImg,
  מקרקעין: realEstateImg,
};

function pickImage(category: string) {
  return CATEGORY_IMAGE[category] ?? civilImg;
}

function LawyerFeed() {
  const navigate = useNavigate();
  const { feed } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a0a0c] text-white">
      {/* Header */}
      <div
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-8 pb-4 backdrop-blur-xl"
        style={{ backgroundColor: "rgba(10,10,12,0.75)" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/lawyer-subscription" })}
          className="flex items-center gap-1 text-white"
        >
          <span className="text-lg font-semibold">כל הפניות</span>
          <ChevronDown className="size-[18px] text-white/70" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full text-white/70"
          aria-label="לוח שנה"
        >
          <Calendar className="size-[22px]" strokeWidth={1.8} />
        </button>
      </div>

      {/* Scrollable feed */}
      <div className="relative z-10 space-y-4 overflow-y-auto px-6 pb-28 pt-24">
        {feed.map((f, i) => {
          const delay = 0.15 + i * 0.12;
          return (
            <motion.button
              key={f.id}
              type="button"
              onClick={() =>
                navigate({
                  to: "/lawyer-case/$caseId",
                  params: { caseId: f.id },
                })
              }
              initial={{ opacity: 0, y: 24 }}
              animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
              className="relative block h-[200px] w-full overflow-hidden rounded-2xl text-start"
            >
              <img
                src={pickImage(f.category)}
                alt=""
                loading="lazy"
                width={1024}
                height={1024}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

              {/* Top badges */}
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                <span className="liquid-glass rounded-full px-3 py-1 text-[11px] font-normal text-white/90">
                  {f.interestedCount} מתעניינים · {f.postedAgo}
                </span>
                <span className="liquid-glass grid size-8 place-items-center rounded-full">
                  <MoreHorizontal className="size-4 text-white/80" />
                </span>
              </div>

              {/* Urgency chip */}
              {f.urgency === "דחוף" && (
                <span className="absolute right-3 top-12 rounded-full bg-[#d4af37] px-2.5 py-1 text-[10px] font-bold text-[#1a1305]">
                  דחוף
                </span>
              )}

              {/* Huge display title */}
              <div className="absolute inset-x-0 bottom-0 h-[80px] overflow-hidden">
                <h2
                  className="text-center leading-none tracking-tight"
                  style={{
                    fontSize: "72px",
                    marginTop: "2px",
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 700,
                  }}
                >
                  {f.category}
                </h2>
              </div>

              {/* Title strip */}
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/50 px-3 py-2 backdrop-blur-md">
                <p className="truncate text-[13px] font-semibold text-white">
                  {f.title}
                </p>
                <p className="truncate text-[11px] text-white/60">
                  {f.location}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
