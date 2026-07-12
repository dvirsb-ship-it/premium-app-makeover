import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Check, MapPin, Scale, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page } from "../components/motion";
import { useAppStore } from "../lib/store";

export const Route = createFileRoute("/lawyer-case/$caseId")({
  component: LawyerCaseDetail,
});

function LawyerCaseDetail() {
  const { caseId } = Route.useParams();
  const router = useRouter();
  const { getFeedCase, expressInterest } = useAppStore();
  const item = getFeedCase(caseId);

  if (!item) {
    return (
      <AppShell>
        <TopBar title="פנייה לא נמצאה" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">הפנייה המבוקשת אינה קיימת.</p>
          <Link
            to="/lawyer"
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            לרשימת הפניות
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell bare>
      <Page className="flex min-h-screen flex-col">
        <TopBar title="פרטי הפנייה" subtitle={item.category} />

        <div className="flex-1 px-5 pt-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-bold text-primary">
              {item.category}
            </span>
            {item.urgency === "דחוף" && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
                דחוף
              </span>
            )}
          </div>

          <h2 className="mt-4 text-xl font-black leading-snug text-foreground">
            {item.title}
          </h2>

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 text-gold" />
              {item.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-gold" />
              {item.interestedCount} מתעניינים
            </span>
            <span>{item.postedAgo}</span>
          </div>

          <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-luxe">
            <h3 className="text-sm font-bold text-foreground">תיאור המקרה</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/8 px-4 py-3 text-xs leading-relaxed text-foreground">
            <Scale className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>
              הבעת עניין מציבה אותך ברשימת עורכי הדין שהלקוח בוחר מתוכה. פרטי
              הקשר ייחשפו רק לאחר בחירת הלקוח.
            </span>
          </div>
        </div>

        {/* Footer action */}
        <div className="sticky bottom-0 border-t border-border/60 bg-background/90 px-5 py-5 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {item.expressed ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-success/12 py-4 text-sm font-bold text-success"
              >
                <Check className="size-5" strokeWidth={3} />
                הבעת עניין נשלחה בהצלחה
              </motion.div>
            ) : (
              <motion.button
                key="express"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  expressInterest(item.id);
                  window.setTimeout(() => router.history.back(), 900);
                }}
                className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-gold"
              >
                אני מעוניין/ת בתיק זה
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </Page>
    </AppShell>
  );
}
