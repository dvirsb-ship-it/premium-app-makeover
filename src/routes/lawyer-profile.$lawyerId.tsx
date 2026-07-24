import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Award, Briefcase, MessageCircle, Phone, Star } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useAppStore } from "../lib/store";
import lawyerPortrait from "../assets/lawyer-portrait.jpg";

export const Route = createFileRoute("/lawyer-profile/$lawyerId")({
  head: () => ({
    meta: [
      { title: "JustAsk — פרופיל עורך דין" },
      {
        name: "description",
        content: "פרופיל עורך הדין: התמחות, ניסיון, ביקורות ופרטי יצירת קשר.",
      },
      { property: "og:title", content: "JustAsk — פרופיל עורך דין" },
      {
        property: "og:description",
        content: "כרטיס פרופיל מלא של עורך הדין שבחרתם ב-JustAsk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LawyerProfile,
});

function LawyerProfile() {
  const { lawyerId } = Route.useParams();
  const navigate = useNavigate();
  const { cases } = useAppStore();

  const chosenCase = cases.find((c) => c.chosenLawyerId === lawyerId);
  const lawyer =
    chosenCase?.interested.find((l) => l.id === lawyerId) ??
    cases.flatMap((c) => c.interested).find((l) => l.id === lawyerId);

  if (!lawyer) {
    return (
      <AppShell>
        <TopBar title="פרופיל" onBack={() => navigate({ to: "/cases" })} />
        <div className="grid flex-1 place-items-center py-24 text-center">
          <div>
            <p className="text-lg font-semibold text-foreground">
              עורך הדין לא נמצא
            </p>
            <Link
              to="/cases"
              className="btn-gold mt-4 inline-flex rounded-full px-5 py-2 text-sm font-bold"
            >
              לתיקים שלי
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const stats = [
    { n: `${lawyer.reviews}`, label: "לקוחות מרוצים", icon: Star },
    { n: `${lawyer.rating}`, label: "דירוג ממוצע", icon: Award },
    {
      n: `${Math.round(lawyer.years * 8.4)}`,
      label: "תיקים שנוהלו",
      icon: Briefcase,
    },
  ];

  return (
    <AppShell>
      <TopBar title="פרופיל עורך דין" onBack={() => navigate({ to: "/cases" })} />

      {/* Portrait card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="liquid-glass relative mt-5 overflow-hidden rounded-[28px] p-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-3xl ring-1 ring-gold/30">
            <img
              src={lawyerPortrait}
              alt={lawyer.name}
              width={512}
              height={640}
              className="h-full w-full object-cover object-[center_20%]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              {lawyer.specialty}
            </p>
            <h1 className="mt-1 truncate text-[22px] font-bold text-foreground">
              {lawyer.name.replace(/^עו״ד\s*/, "")}
            </h1>
            <p className="truncate text-[13px] text-muted-foreground">
              {lawyer.firm}
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold">
              <Award className="size-3.5" strokeWidth={2.2} />
              {lawyer.years} שנות ניסיון
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15 + i * 0.08,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="liquid-glass flex flex-col items-center rounded-[24px] px-2 py-4 text-center"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-gold/12 ring-1 ring-gold/25">
                <Icon className="size-4 text-gold" strokeWidth={2} />
              </span>
              <p className="mt-2 text-[20px] font-bold leading-none text-foreground">
                {s.n}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                {s.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Specialty / blurb */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="liquid-glass mt-3 rounded-[24px] p-4"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
          התמחות
        </p>
        <p className="mt-1 text-[16px] font-semibold text-foreground">
          {lawyer.specialty}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {lawyer.blurb}
        </p>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 flex gap-3 pb-10"
      >
        <button
          type="button"
          className="btn-gold flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold"
        >
          <MessageCircle className="size-4" strokeWidth={2.4} />
          שליחת הודעה
        </button>
        <button
          type="button"
          className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-semibold text-foreground"
        >
          <Phone className="size-4 text-gold" strokeWidth={2.2} />
          התקשרות
        </button>
      </motion.div>
    </AppShell>
  );
}
