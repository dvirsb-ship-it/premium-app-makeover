import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { BadgeCheck, MapPin, Search } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { useT, translate } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { useAppStore } from "../lib/store";
import { fbDb, fbAuth } from "../lib/firebase";
import { cn } from "../lib/utils";
import { SPECIALTIES } from "../lib/specialties";
import { categoryIcon } from "../lib/category-icons";
import { haptic } from "../lib/haptics";
import type { IndexLawyer } from "../lib/ai/intake.functions";

export const Route = createFileRoute("/choose/$caseId")({
  head: () => ({
    meta: [
      { title: "בחירת עורך דין — JustAsk" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChooseLawyer,
});

/**
 * האינדקס — הפונה מאתר ובוחר עורך דין בעצמו.
 *
 * ═══ המסך המרכזי של המתווה החדש (20/8/2026) ═══
 *
 * מה שקובע כאן אינו מה שיש אלא מה שאין, ובמכוון:
 * - אין דירוג, אין "מומלץ", אין מד התאמה. הסדר א״ב והמסך אומר זאת
 *   ומוסיף שאיש אינו משלם על מיקום (5.3 לסקירה).
 * - אין מחירים — אסור בפרסום (2.3). ההצעה תגיע פרטנית, אחרי בחירה.
 * - הסינון לפי עובדות שהפונה בוחר: תחום (נקבע במסך הקודם), עיר.
 * - הפנייה שולחת שמות לבדיקת ניגוד בלבד, והמסך אומר לפונה בדיוק
 *   מה נשלח ומה לא (2.5). עד שלוש פניות פעילות.
 */
function ChooseLawyer() {
  useRequireAuth();
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAppStore();

  const [category, setCategory] = useState("");
  const [lawyers, setLawyers] = useState<IndexLawyer[] | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [activeCount, setActiveCount] = useState(0);
  const [cityFilter, setCityFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  /* אינדקס ריק — בחירת תחום אחר בו-במקום, בלי מבוי סתום */
  const [picker, setPicker] = useState(false);
  const [switching, setSwitching] = useState(false);

  /* התיק — התחום שנבחר במסך הסיכום */
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const snap = await getDoc(doc(fbDb(), "cases", caseId));
      if (!snap.exists() || snap.data().clientId !== user.uid) {
        navigate({ to: "/cases" });
        return;
      }
      setCategory(String(snap.data().category ?? ""));
    })();
  }, [caseId, user, navigate]);

  /* האינדקס — מהשרת, כי "מאושר" נקבע במסמך שהלקוח אינו רשאי לקרוא */
  useEffect(() => {
    if (!category) return;
    void (async () => {
      try {
        const { indexLawyersFn } = await import("../lib/ai/intake.functions");
        const idToken = await fbAuth().currentUser?.getIdToken();
        const res = await indexLawyersFn({ data: { category, idToken } });
        setLawyers(res.lawyers);
      } catch {
        setLawyers([]);
      }
    })();
  }, [category]);

  /* הפניות הקיימות על התיק — למי כבר נשלח, וכמה פעילות */
  useEffect(() => {
    if (!user) return;
    const q = query(collection(fbDb(), "referrals"), where("caseId", "==", caseId));
    return onSnapshot(q, (snap) => {
      const sent = new Set<string>();
      let active = 0;
      snap.docs.forEach((d) => {
        const r = d.data();
        sent.add(String(r.lawyerId));
        if (["names_check", "cleared", "details_shared"].includes(String(r.status))) active++;
      });
      setSentTo(sent);
      setActiveCount(active);
    });
  }, [caseId, user]);

  const shown = useMemo(() => {
    if (!lawyers) return null;
    const f = cityFilter.trim();
    return f ? lawyers.filter((l) => (l.city ?? "").includes(f)) : lawyers;
  }, [lawyers, cityFilter]);

  async function choose(uid: string) {
    if (busy) return;
    setBusy(uid);
    setErr(false);
    try {
      const { requestReferralFn } = await import("../lib/ai/intake.functions");
      const idToken = await fbAuth().currentUser?.getIdToken();
      const res = await requestReferralFn({ data: { caseId, lawyerUid: uid, idToken } });
      if (res.ok) haptic("success");
      else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setBusy(null);
    }
  }

  const atLimit = activeCount >= 3;

  async function changeField(value: string) {
    if (switching || value === category) {
      setPicker(false);
      return;
    }
    setSwitching(true);
    try {
      const { changeCategoryFn } = await import("../lib/ai/intake.functions");
      const idToken = await fbAuth().currentUser?.getIdToken();
      const res = await changeCategoryFn({ data: { caseId, category: value, idToken } });
      if (res.ok) {
        haptic("light");
        setLawyers(null);
        setCategory(res.category);
        setPicker(false);
      }
    } catch {
      setErr(true);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <AppShell>
      <TopBar title={t("idxTitle")} subtitle={category || t("idxSub")} />
      <Page>
        <Stagger className="space-y-4 pb-10 pt-4">
          <Rise>
            {/* מה נשלח ומה לא — ההבטחה של המודל, כתובה במקום שהיא מתקיימת */}
            <p className="note-gold rounded-2xl text-[12px] leading-relaxed text-foreground/75">
              {t("idxWhatSent")}
            </p>
          </Rise>

          <Rise>
            <div className="flex items-center gap-2">
              <label className="relative flex-1">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder={t("idxFilterCity")}
                  aria-label={t("idxFilterCity")}
                  className="w-full rounded-2xl border border-border bg-background/60 py-2.5 ps-10 pe-3 text-[13px] text-foreground"
                />
              </label>
            </div>
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              {t("idxOrderNote")} · {t("idxLimit")}
            </p>
          </Rise>

          {atLimit && (
            <Rise>
              <p className="recessed rounded-2xl bg-[var(--recess-fill)] px-4 py-3 text-[12.5px] font-semibold text-foreground/75">
                {t("idxLimitHit")}
              </p>
            </Rise>
          )}

          {shown === null ? (
            <Rise><div className="liquid-glass h-32 animate-pulse rounded-3xl" /></Rise>
          ) : shown.length === 0 ? (
            <Rise>
              <div className="liquid-glass rounded-3xl p-6 text-center">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {lawyers && lawyers.length > 0 ? t("idxEmptyCity") : t("idxEmpty")}
                </p>
                {(!lawyers || lawyers.length === 0) &&
                  (picker ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-start">
                      {SPECIALTIES.map((sp) => {
                        const label = t(sp.labelKey);
                        const value = translate(sp.labelKey, "he");
                        const Icon = categoryIcon(value);
                        const on = value === category;
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            disabled={switching}
                            onClick={() => void changeField(value)}
                            aria-pressed={on}
                            className={cn(
                              "flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2.5 text-start text-[12.5px] font-semibold transition disabled:opacity-45",
                              on ? "chip-gold" : "border border-border bg-background/50 text-foreground/80",
                            )}
                          >
                            <Icon className="size-4 shrink-0" aria-hidden />
                            <span className="min-w-0 flex-1 truncate">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPicker(true)}
                      className="btn-gold mt-4 min-h-11 rounded-2xl px-6 text-[13px] font-bold"
                    >
                      {t("idxChangeField")}
                    </button>
                  ))}
              </div>
            </Rise>
          ) : (
            shown.map((l) => {
              const sent = sentTo.has(l.uid);
              return (
                <Rise key={l.uid}>
                  <div className="liquid-glass rounded-3xl p-5">
                    <div className="flex items-start gap-3.5">
                      {l.photoUrl ? (
                        <img src={l.photoUrl} alt={l.name}
                          className="size-14 shrink-0 rounded-2xl object-cover" />
                      ) : (
                        <span className="chip-navy grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-black">
                          {l.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-bold text-foreground">{l.name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                          {l.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" aria-hidden />{l.city}
                            </span>
                          )}
                          {l.barYear && <span>{t("idxSince").replace("{y}", l.barYear)}</span>}
                          {l.languages && l.languages.length > 0 && <span>{l.languages.join(" · ")}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {l.specialties.slice(0, 3).map((s) => (
                            <span key={s} className="chip-navy rounded-full px-2 py-0.5 text-[10px] font-bold">{s}</span>
                          ))}
                        </div>
                        {l.bio && (
                          <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/75">{l.bio}</p>
                        )}
                        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-success-ink">
                          <BadgeCheck className="size-3.5" aria-hidden />
                          {t("idxLicense")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={sent || atLimit || busy === l.uid}
                      onClick={() => void choose(l.uid)}
                      className={cn(
                        "mt-4 min-h-11 w-full rounded-2xl text-[13.5px] font-bold transition",
                        sent
                          ? "bg-success/12 text-success-ink"
                          : "btn-gold disabled:opacity-45",
                      )}
                    >
                      {sent ? t("idxSent") : t("idxChoose")}
                    </button>
                  </div>
                </Rise>
              );
            })
          )}

          {err && <p className="text-center text-[12px] text-destructive-ink">{t("idxErr")}</p>}
        </Stagger>
      </Page>
    </AppShell>
  );
}
