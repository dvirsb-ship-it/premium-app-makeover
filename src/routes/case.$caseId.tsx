import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Check, MessageCircle, Phone, Star } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Stagger, Rise } from "../components/motion";
import { useAppStore } from "../lib/store";
import { statusMeta, toneClasses } from "../lib/status";
import type { Lawyer } from "../lib/types";

export const Route = createFileRoute("/case/$caseId")({
  component: CaseDetail,
});

function CaseDetail() {
  const { caseId } = Route.useParams();
  const { getCase, chooseLawyer } = useAppStore();
  const item = getCase(caseId);

  if (!item) {
    return (
      <AppShell>
        <TopBar title="תיק לא נמצא" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">התיק המבוקש אינו קיים.</p>
          <Link
            to="/cases"
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            לתיקים שלי
          </Link>
        </div>
      </AppShell>
    );
  }

  const meta = statusMeta[item.status];
  const chosen = item.interested.find((l) => l.id === item.chosenLawyerId);

  return (
    <AppShell bare>
      <Page className="min-h-screen">
        <TopBar title="פרטי המקרה" subtitle={item.category} />

        <div className="px-5 pt-6">
          {/* Summary card */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-luxe">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses[meta.tone]}`}
            >
              {meta.label}
            </span>
            <h2 className="mt-3 text-lg font-bold leading-snug text-foreground">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          </div>

          {/* Connected state */}
          <AnimatePresence mode="wait">
            {chosen ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="rounded-3xl border border-success/30 bg-success/8 p-5 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-success text-success-foreground">
                    <Check className="size-6" strokeWidth={3} />
                  </span>
                  <h3 className="mt-3 text-base font-bold text-foreground">
                    נוצר חיבור עם {chosen.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    עורך הדין יצור איתך קשר בהקדם. אפשר גם לפנות ישירות:
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">
                      <MessageCircle className="size-4 text-gold" />
                      הודעה
                    </button>
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground">
                      <Phone className="size-4 text-gold" />
                      התקשרות
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="choose"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8"
              >
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-foreground">
                    עורכי דין שהביעו עניין
                  </h3>
                  <span className="text-sm font-bold text-gold">
                    {item.interested.length}
                  </span>
                </div>

                {item.interested.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
                    עדיין אין התעניינות. נעדכן אותך ברגע שעורך דין יביע עניין.
                  </div>
                ) : (
                  <Stagger className="space-y-4">
                    {item.interested.map((l) => (
                      <Rise key={l.id}>
                        <LawyerChoiceCard
                          lawyer={l}
                          onChoose={() => chooseLawyer(item.id, l.id)}
                        />
                      </Rise>
                    ))}
                  </Stagger>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Page>
    </AppShell>
  );
}

function LawyerChoiceCard({
  lawyer,
  onChoose,
}: {
  lawyer: Lawyer;
  onChoose: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-luxe">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-sm font-black text-gold">
          {lawyer.initials}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[15px] font-bold leading-tight text-foreground">
            {lawyer.name}
          </h4>
          <p className="truncate text-xs text-muted-foreground">{lawyer.firm}</p>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-0.5 font-bold text-foreground">
              <Star className="size-3.5 fill-gold text-gold" />
              {lawyer.rating}
            </span>
            <span className="text-muted-foreground">
              ({lawyer.reviews}) · {lawyer.years} שנות ניסיון
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {lawyer.blurb}
      </p>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onChoose}
        className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-luxe"
      >
        בחירת עורך דין זה
      </motion.button>
    </div>
  );
}
