import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Calendar, Clock, Sparkles, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { useAppStore } from "../lib/store";
import injuryImg from "../assets/categories/personal-injury.jpg";
import employmentImg from "../assets/categories/employment.jpg";
import realEstateImg from "../assets/categories/real-estate.jpg";
import civilImg from "../assets/categories/civil.jpg";

export const Route = createFileRoute("/lawyer")({
  head: () => ({
    meta: [
      { title: "JustAsk — פיד עורכי דין" },
      {
        name: "description",
        content: "פניות משפטיות טריות המחכות להבעת עניין מעורכי דין מומחים.",
      },
      { property: "og:title", content: "JustAsk — פיד עורכי דין" },
      {
        property: "og:description",
        content: "פניות משפטיות איכותיות בזמן אמת לעורכי דין ב-JustAsk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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

  return (
    <AppShell withNav>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between pt-6"
      >
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-gold">
            JUSTASK · PRO
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            פניות חדשות
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/lawyer-subscription" })}
          className="liquid-glass grid size-11 place-items-center rounded-full text-foreground"
          aria-label="מנוי Pro"
        >
          <Sparkles className="size-5 text-gold" strokeWidth={2} />
        </button>
      </motion.header>

      {/* Stat pills */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 flex gap-2"
      >
        <span className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-foreground">
          <Users className="size-3.5 text-gold" strokeWidth={2} />
          {feed.length} פניות פתוחות
        </span>
        <span className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-foreground">
          <Calendar className="size-3.5 text-gold" strokeWidth={2} />
          היום
        </span>
      </motion.div>

      {/* Feed */}
      <div className="mt-6 space-y-3">
        {feed.map((f, i) => (
          <motion.button
            key={f.id}
            type="button"
            onClick={() =>
              navigate({
                to: "/lawyer-case/$caseId",
                params: { caseId: f.id },
              })
            }
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.15 + i * 0.08,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileTap={{ scale: 0.98 }}
            className="liquid-glass relative flex w-full items-stretch gap-3 overflow-hidden rounded-[24px] p-3 text-start"
          >
            {/* Thumbnail */}
            <div className="relative size-[88px] shrink-0 overflow-hidden rounded-2xl">
              <img
                src={pickImage(f.category)}
                alt=""
                loading="lazy"
                width={512}
                height={512}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                    {f.category}
                  </span>
                  {f.urgency === "דחוף" && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                      דחוף
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[15px] font-semibold text-foreground">
                  {f.title}
                </p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {f.location}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {f.interestedCount}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {f.postedAgo}
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <BottomNav />
    </AppShell>
  );
}
