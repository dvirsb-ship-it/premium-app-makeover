import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Page } from "../components/motion";

export const Route = createFileRoute("/submitted")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: Submitted,
});

function Submitted() {
  const navigate = useNavigate();
  const { id } = Route.useSearch();

  return (
    <AppShell className="items-center justify-center">
      <Page className="flex min-h-screen w-full flex-col items-center justify-center py-16 text-center">
        {/* Success burst */}
        <div className="relative grid place-items-center">
          {[...Array(8)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute size-1.5 rounded-full bg-gold"
              initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i / 8) * Math.PI * 2) * 70,
                y: Math.sin((i / 8) * Math.PI * 2) * 70,
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            />
          ))}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="grid size-24 place-items-center rounded-full bg-primary shadow-gold"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 400 }}
            >
              <Check className="size-12 text-gold" strokeWidth={2.6} />
            </motion.span>
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-2xl font-black text-foreground"
        >
          המקרה שלך נשלח בהצלחה
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground"
        >
          עורכי דין מתאימים בתחומך יקבלו את הפנייה. נעדכן אותך ברגע שמישהו יביע
          עניין.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-10 w-full space-y-3"
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                id
                  ? { to: "/case/$caseId", params: { caseId: id } }
                  : { to: "/cases" },
              )
            }
            className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-luxe transition active:scale-[0.98]"
          >
            צפייה בסטטוס המקרה
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-muted-foreground"
          >
            <Sparkles className="size-4 text-gold" />
            חזרה לדף הבית
          </Link>
        </motion.div>
      </Page>
    </AppShell>
  );
}
