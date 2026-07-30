import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  IdCard,
  Loader2,
  Scale,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { useAppStore } from "../lib/store";
import { writeLawyerContact, writeLawyerProfile } from "../lib/db";
import { SPECIALTIES, type SpecId as SharedSpecId } from "../lib/specialties";
import { cn } from "../lib/utils";
import { enqueueVerification, type VerificationRecord } from "../lib/verification-queue";
import { exportVerificationPdf } from "../lib/pdf-export";

export const Route = createFileRoute("/lawyer-onboarding")({
  head: () => ({
    meta: [
      { title: "JustAsk — Lawyer verification" },
      {
        name: "description",
        content:
          "Verify your identity, bar license and specialties to join the JustAsk lawyer roster.",
      },
      { property: "og:title", content: "JustAsk — Lawyer verification" },
      {
        property: "og:description",
        content: "Multi-step credential verification for lawyers on JustAsk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LawyerOnboarding,
});

/* ---------- Types ---------- */

/*
 * הרשימה באה מ-src/lib/specialties.ts ולא מכאן.
 *
 * קודם היו כאן 17 תחומים — פלילי, משפחה, מיסים, קניין רוחני, הגירה,
 * תאגידים, צבאי, מנהלי — בעוד הוולידציה מסווגת ל-7 קטגוריות בלבד.
 * עורך דין שבחר אחד מעשרת התחומים שאין להם קטגוריה תואמת היה נרשם,
 * עובר אימות, ולא מקבל אף פנייה. לעולם. עדיף להגיד לו מראש מה אנחנו
 * מכסים מאשר להשאיר אותו ממתין לתור שלא יגיע.
 */
type SpecId = SharedSpecId;

type StepId = "intro" | "identity" | "bar" | "education" | "specialties" | "review";
const STEPS: StepId[] = ["intro", "identity", "bar", "education", "specialties", "review"];

interface Uploaded {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

interface FormState {
  fullName: string;
  idNumber: string;
  email: string;
  phone: string;
  city: string;
  barNumber: string;
  barYear: string;
  barCardFile: Uploaded | null;
  university: string;
  gradYear: string;
  diplomaFile: Uploaded | null;
  specialties: Set<SpecId>;
}

type IssueField =
  | "fullName"
  | "idNumber"
  | "email"
  | "phone"
  | "city"
  | "barNumber"
  | "barYear"
  | "barCard"
  | "university"
  | "gradYear"
  | "diploma"
  | "specialties";

interface Issue {
  field: IssueField;
  messageKey: StringKey;
  step: StepId;
}

/* ---------- Validators ---------- */

/** Israeli ID (Teudat Zehut) Luhn-style checksum. */
function isValidIsraeliId(id: string): boolean {
  const digits = id.replace(/\D/g, "").padStart(9, "0");
  if (digits.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let num = Number(digits[i]) * ((i % 2) + 1);
    if (num > 9) num -= 9;
    sum += num;
  }
  return sum % 10 === 0;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

function isValidYear(v: string) {
  if (!/^\d{4}$/.test(v)) return false;
  const y = Number(v);
  return y >= 1950 && y <= new Date().getFullYear();
}

function collectIssues(form: FormState): Issue[] {
  const issues: Issue[] = [];
  if (form.fullName.trim().length < 2)
    issues.push({ field: "fullName", messageKey: "issueFullName", step: "identity" });
  if (!isValidIsraeliId(form.idNumber))
    issues.push({ field: "idNumber", messageKey: "issueIdNumber", step: "identity" });
  if (!isValidEmail(form.email))
    issues.push({ field: "email", messageKey: "issueEmail", step: "identity" });
  if (form.phone.replace(/\D/g, "").length < 9)
    issues.push({ field: "phone", messageKey: "issuePhone", step: "identity" });
  if (form.city.trim().length < 2)
    issues.push({ field: "city", messageKey: "issueCity", step: "identity" });

  if (form.barNumber.trim().length < 3)
    issues.push({ field: "barNumber", messageKey: "issueBarNumber", step: "bar" });
  if (!isValidYear(form.barYear))
    issues.push({ field: "barYear", messageKey: "issueBarYear", step: "bar" });
  if (!form.barCardFile)
    issues.push({ field: "barCard", messageKey: "issueBarCard", step: "bar" });

  if (form.university.trim().length < 2)
    issues.push({ field: "university", messageKey: "issueUniversity", step: "education" });
  if (!isValidYear(form.gradYear))
    issues.push({ field: "gradYear", messageKey: "issueGradYear", step: "education" });
  if (!form.diplomaFile)
    issues.push({ field: "diploma", messageKey: "issueDiploma", step: "education" });

  if (form.specialties.size === 0)
    issues.push({ field: "specialties", messageKey: "issueSpecialties", step: "specialties" });

  return issues;
}

/* ---------- Component ---------- */

function LawyerOnboarding() {
  useRequireAuth();
  const navigate = useNavigate();
  const { dir } = useSettings();
  const { user } = useAppStore();
  const t = useT();
  const rtl = dir === "rtl";

  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<FormState>({
    fullName: "",
    idNumber: "",
    email: "",
    phone: "",
    city: "",
    barNumber: "",
    barYear: "",
    barCardFile: null,
    university: "",
    gradYear: "",
    diplomaFile: null,
    specialties: new Set<SpecId>(["injury"]),
  });

  const [verifyState, setVerifyState] = useState<"idle" | "running" | "pass" | "fail">("idle");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [record, setRecord] = useState<VerificationRecord | null>(null);

  const step = STEPS[stepIdx];
  const contentSteps = STEPS.slice(1);
  const contentIdx = Math.max(0, stepIdx - 1);
  const progress = step === "intro" ? 0 : (contentIdx + 1) / contentSteps.length;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSpec(id: SpecId) {
    setForm((prev) => {
      const next = new Set(prev.specialties);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, specialties: next };
    });
  }

  function jumpToStep(id: StepId) {
    const idx = STEPS.indexOf(id);
    if (idx >= 0) setStepIdx(idx);
    setVerifyState("idle");
  }

  function goNext() {
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
  }
  function goBack() {
    if (verifyState === "running" || verifyState === "pass" || verifyState === "fail") {
      setVerifyState("idle");
      return;
    }
    if (stepIdx === 0) {
      navigate({ to: "/" });
      return;
    }
    setStepIdx(stepIdx - 1);
  }

  function runVerification() {
    setVerifyState("running");
    const found = collectIssues(form);
    // האנימציה רצה במקביל להעלאה האמיתית ל-Storage + Firestore.
    window.setTimeout(() => {
      if (found.length === 0) {
        void (async () => {
          try {
            const rec = await enqueueVerification(
              {
                fullName: form.fullName,
                idNumber: form.idNumber,
                email: form.email,
                phone: form.phone,
                barNumber: form.barNumber,
                barYear: form.barYear,
                university: form.university,
                gradYear: form.gradYear,
                specialties: [...form.specialties],
              },
              { barCard: form.barCardFile, diploma: form.diplomaFile },
            );
            setRecord(rec);
            try {
              sessionStorage.setItem(
                "justask-lawyer-specialties",
                JSON.stringify([...form.specialties]),
              );
            } catch {
              /* ignore */
            }
            // רישום במדריך עורכי הדין — כך התראות על תיקים חדשים בתחום יגיעו אליו
            if (user) {
              void writeLawyerProfile(user.uid, {
                name: form.fullName,
                specialties: [...form.specialties],
                barYear: form.barYear,
                university: form.university,
                city: form.city.trim(),
              }).catch(() => {});
              // פרטי קשר — אוסף פרטי, נחשף ללקוח רק אחרי חיבור רשמי
              void writeLawyerContact(user.uid, {
                fullName: form.fullName,
                phone: form.phone,
                email: form.email,
              }).catch(() => {});
            }
            setVerifyState("pass");
          } catch {
            toast.error(t("verifyUploadError"));
            setVerifyState("idle");
          }
        })();
      } else {
        setIssues(found);
        setVerifyState("fail");
      }
    }, 2600);
  }

  function finishOnboarding() {
    toast.success(t("verifySuccess"));
    navigate({ to: "/lawyer" });
  }

  const NextIcon = rtl ? ChevronLeft : ChevronRight;
  const showingVerify = verifyState !== "idle";

  return (
    <AppShell>
      <TopBar
        title={t("lawyerOnboardTitle")}
        subtitle={
          showingVerify
            ? t("aiVerifyBadge")
            : step === "intro"
              ? t("lawyerOnboardSubtitle")
              : t("lawyerVerifyStepOf")
                  .replace("{n}", String(contentIdx + 1))
                  .replace("{total}", String(contentSteps.length))
        }
        onBack={goBack}
      />

      {step !== "intro" && !showingVerify && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#F1E4C3] via-gold to-[#B8912B]"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
          />
        </div>
      )}

      <div className="mt-5 flex-1">
        <AnimatePresence mode="wait">
          {showingVerify ? (
            <motion.div
              key={`verify-${verifyState}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {verifyState === "running" && <VerifyRunning />}
              {verifyState === "pass" && (
                <VerifyPass form={form} record={record} onContinue={finishOnboarding} />
              )}
              {verifyState === "fail" && (
                <VerifyFail
                  issues={issues}
                  onJump={jumpToStep}
                  onRerun={runVerification}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === "intro" && <IntroStep />}
              {step === "identity" && <IdentityStep form={form} update={update} />}
              {step === "bar" && <BarStep form={form} update={update} />}
              {step === "education" && <EducationStep form={form} update={update} />}
              {step === "specialties" && (
                <SpecialtiesStep
                  selected={form.specialties}
                  toggle={toggleSpec}
                />
              )}
              {step === "review" && <ReviewStep form={form} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!showingVerify && (
        <div className="mt-6 pb-6">
          {step === "review" ? (
            <>
              <motion.button
                type="button"
                onClick={runVerification}
                whileTap={{ scale: 0.97 }}
                className="btn-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold"
              >
                <ShieldCheck className="size-5" strokeWidth={2.4} />
                {t("reviewSubmit")}
              </motion.button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                {t("reviewFinePrint")}
              </p>
            </>
          ) : (
            <motion.button
              type="button"
              onClick={step === "intro" ? () => setStepIdx(1) : goNext}
              whileTap={{ scale: 0.97 }}
              className="btn-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold"
            >
              {step === "intro" ? t("lawyerVerifyBegin") : t("nextStep")}
              <NextIcon className="size-5" strokeWidth={2.4} />
            </motion.button>
          )}
        </div>
      )}
    </AppShell>
  );
}

/* ---------- Verification screens ---------- */

function VerifyRunning() {
  const t = useT();
  const stepKeys: StringKey[] = ["aiStep1", "aiStep2", "aiStep3", "aiStep4"];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((a) => (a < stepKeys.length - 1 ? a + 1 : a));
    }, 600);
    return () => window.clearInterval(id);
  }, [stepKeys.length]);

  return (
    <div className="pt-6">
      <span className="liquid-glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium text-foreground">
        <Sparkles className="size-3 text-gold" strokeWidth={2} />
        {t("aiVerifyBadge")}
      </span>
      <h2 className="mt-4 text-[22px] font-bold leading-tight tracking-tight text-foreground">
        {t("aiVerifyTitle")}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("aiVerifySub")}</p>

      <div className="mt-6 space-y-2.5">
        {stepKeys.map((k, i) => {
          const done = i < active;
          const running = i === active;
          return (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full transition-colors",
                  done
                    ? "bg-gold/25 text-gold"
                    : running
                      ? "bg-foreground/10 text-gold"
                      : "bg-foreground/5 text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  <Loader2 className={cn("size-4", running && "animate-spin")} />
                )}
              </span>
              <span className="text-sm font-medium text-foreground">{t(k)}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function VerifyPass({
  form,
  record,
  onContinue,
}: {
  form: FormState;
  record: VerificationRecord | null;
  onContinue: () => void;
}) {
  const t = useT();
  const { lang } = useSettings();
  const now = useMemo(() => new Date(), []);
  const dateStr = now.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function handleDownload() {
    if (!record) return;
    exportVerificationPdf(record);
    toast.success(t("pdfExported"));
  }

  return (
    <div className="pt-4">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] shadow-xl shadow-gold/25"
      >
        <BadgeCheck className="size-10 text-[#0F172A]" strokeWidth={2.4} />
      </motion.div>

      <h2 className="mt-5 text-center text-[22px] font-bold leading-tight text-foreground">
        {t("aiPassTitle")}
      </h2>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">{t("aiPassSub")}</p>

      <div className="mt-6 liquid-glass rounded-2xl px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
            {t("officialSummary")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {t("submittedOn")} {dateStr}
          </span>
        </div>
        <dl className="mt-3 space-y-1.5 text-[12px]">
          <SumRow labelKey="fieldFullName" value={form.fullName} />
          <SumRow labelKey="fieldIdNumber" value={form.idNumber} />
          <SumRow labelKey="fieldBarNumber" value={`#${form.barNumber} · ${form.barYear}`} />
          <SumRow
            labelKey="fieldUniversity"
            value={`${form.university} · ${form.gradYear}`}
          />
          <SumRow
            labelKey="stepSpecTitle"
            value={[...form.specialties]
              .map((id) => {
                const s = SPECIALTIES.find((x) => x.id === id);
                return s ? t(s.labelKey) : id;
              })
              .join(" · ")}
          />
        </dl>
      </div>

      <motion.button
        type="button"
        onClick={handleDownload}
        whileTap={{ scale: 0.97 }}
        disabled={!record}
        aria-label={t("downloadPdf")}
        className="liquid-glass mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-foreground disabled:opacity-50"
      >
        <FileText className="size-4 text-gold" strokeWidth={2.4} aria-hidden />
        {t("downloadPdf")}
      </motion.button>

      <motion.button
        type="button"
        onClick={onContinue}
        whileTap={{ scale: 0.97 }}
        className="btn-gold mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold"
      >
        {t("aiPassCta")}
      </motion.button>
    </div>
  );
}


function SumRow({ labelKey, value }: { labelKey: StringKey; value: string }) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{t(labelKey)}</dt>
      <dd className="min-w-0 truncate text-end font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

function VerifyFail({
  issues,
  onJump,
  onRerun,
}: {
  issues: Issue[];
  onJump: (id: StepId) => void;
  onRerun: () => void;
}) {
  const t = useT();
  return (
    <div className="pt-4">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="mx-auto grid size-16 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold"
      >
        <AlertTriangle className="size-8" strokeWidth={2.2} />
      </motion.div>

      <h2 className="mt-4 text-center text-[22px] font-bold leading-tight text-foreground">
        {t("aiFailTitle")}
      </h2>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">{t("aiFailSub")}</p>

      <ul className="mt-6 space-y-2">
        {issues.map((iss, i) => (
          <motion.li
            key={`${iss.field}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <button
              type="button"
              onClick={() => onJump(iss.step)}
              className="liquid-glass flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-start transition active:scale-[0.99]"
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                <AlertTriangle className="size-3.5" strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-foreground">
                  {t(iss.messageKey)}
                </span>
                <span className="mt-0.5 block text-[11px] text-gold">
                  {t("issueFixIn")}
                </span>
              </span>
              <ChevronRight className="mt-1 size-4 text-muted-foreground" />
            </button>
          </motion.li>
        ))}
      </ul>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <motion.button
          type="button"
          onClick={() => onJump(issues[0]?.step ?? "identity")}
          whileTap={{ scale: 0.97 }}
          className="btn-gold flex h-12 items-center justify-center gap-2 rounded-full text-[14px] font-bold"
        >
          {t("aiFailCta")}
        </motion.button>
        <motion.button
          type="button"
          onClick={onRerun}
          whileTap={{ scale: 0.97 }}
          className="liquid-glass flex h-12 items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-foreground"
        >
          {t("aiRunAgain")}
        </motion.button>
      </div>
    </div>
  );
}

/* ---------- Steps ---------- */

function IntroStep() {
  const t = useT();
  return (
    <div className="mt-4 space-y-6">
      <span className="liquid-glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium text-foreground">
        <Scale className="size-3 text-gold" strokeWidth={2} />
        {t("lawyerVerifyIntroBadge")}
      </span>

      <div>
        <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight text-foreground">
          {t("lawyerVerifyTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("lawyerVerifySub")}
        </p>
      </div>

      <div className="space-y-2.5">
        <IntroRow icon={<UserRound className="size-4" />} labelKey="stepIdentityTitle" />
        <IntroRow icon={<IdCard className="size-4" />} labelKey="stepBarTitle" />
        <IntroRow icon={<GraduationCap className="size-4" />} labelKey="stepEducationTitle" />
        <IntroRow icon={<Sparkles className="size-4" />} labelKey="stepSpecTitle" />
      </div>
    </div>
  );
}

function IntroRow({ icon, labelKey }: { icon: ReactNode; labelKey: StringKey }) {
  const t = useT();
  return (
    <div className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3">
      <span className="grid size-9 place-items-center rounded-full bg-gold/15 text-gold">
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground">{t(labelKey)}</span>
      <BadgeCheck className="ms-auto size-4 text-gold/70" />
    </div>
  );
}

function StepHeading({ titleKey, descKey }: { titleKey: StringKey; descKey: StringKey }) {
  const t = useT();
  return (
    <div className="mb-5">
      <h2 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">
        {t(titleKey)}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
    </div>
  );
}

function Field({ labelKey, children }: { labelKey: StringKey; children: ReactNode }) {
  const t = useT();
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-foreground/80">
        {t(labelKey)}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "block w-full rounded-2xl border border-white/10 bg-foreground/[0.04] px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-gold/50 focus:bg-foreground/[0.06]";

function IdentityStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const t = useT();
  return (
    <div>
      <StepHeading titleKey="stepIdentityTitle" descKey="stepIdentityDesc" />
      <div className="space-y-3">
        <Field labelKey="fieldFullName">
          <input
            className={inputCls}
            value={form.fullName}
            placeholder={t("fieldFullNamePh")}
            onChange={(e) => update("fullName", e.target.value)}
            autoComplete="name"
          />
        </Field>
        <Field labelKey="fieldIdNumber">
          <input
            className={inputCls}
            value={form.idNumber}
            placeholder={t("fieldIdNumberPh")}
            inputMode="numeric"
            maxLength={9}
            onChange={(e) => update("idNumber", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field labelKey="fieldEmail">
            <input
              className={inputCls}
              value={form.email}
              type="email"
              placeholder="name@firm.co.il"
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field labelKey="fieldPhone">
            <input
              className={inputCls}
              value={form.phone}
              type="tel"
              placeholder="050-000-0000"
              onChange={(e) => update("phone", e.target.value)}
              autoComplete="tel"
            />
          </Field>
        </div>
        <Field labelKey="fieldCity">
          <input
            className={inputCls}
            value={form.city}
            placeholder={t("fieldCityPh")}
            onChange={(e) => update("city", e.target.value)}
            autoComplete="address-level2"
          />
        </Field>
      </div>
    </div>
  );
}

function BarStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const t = useT();
  return (
    <div>
      <StepHeading titleKey="stepBarTitle" descKey="stepBarDesc" />
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field labelKey="fieldBarNumber">
            <input
              className={inputCls}
              value={form.barNumber}
              placeholder={t("fieldBarNumberPh")}
              inputMode="numeric"
              onChange={(e) => update("barNumber", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field labelKey="fieldBarYear">
            <input
              className={inputCls}
              value={form.barYear}
              placeholder="2015"
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => update("barYear", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>
        <UploadTile
          labelKey="uploadBarCard"
          value={form.barCardFile}
          onChange={(f) => update("barCardFile", f)}
          icon={<IdCard className="size-5" />}
        />
      </div>
    </div>
  );
}

function EducationStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const t = useT();
  return (
    <div>
      <StepHeading titleKey="stepEducationTitle" descKey="stepEducationDesc" />
      <div className="space-y-3">
        <Field labelKey="fieldUniversity">
          <input
            className={inputCls}
            value={form.university}
            placeholder={t("fieldUniversityPh")}
            onChange={(e) => update("university", e.target.value)}
          />
        </Field>
        <Field labelKey="fieldGradYear">
          <input
            className={inputCls}
            value={form.gradYear}
            placeholder="2013"
            inputMode="numeric"
            maxLength={4}
            onChange={(e) => update("gradYear", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <UploadTile
          labelKey="uploadDiploma"
          value={form.diplomaFile}
          onChange={(f) => update("diplomaFile", f)}
          icon={<GraduationCap className="size-5" />}
        />
      </div>
    </div>
  );
}

function SpecialtiesStep({
  selected,
  toggle,
}: {
  selected: Set<SpecId>;
  toggle: (id: SpecId) => void;
}) {
  const t = useT();
  return (
    <div>
      <StepHeading titleKey="stepSpecTitle" descKey="stepSpecDesc" />
      <div className="flex flex-wrap gap-2">
        {SPECIALTIES.map((s, i) => {
          const isSel = selected.has(s.id);
          return (
            <motion.button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold transition",
                isSel
                  ? "bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] text-[#0F172A] shadow-lg shadow-gold/25"
                  : "liquid-glass text-foreground",
              )}
            >
              {isSel && <Check className="size-3.5" strokeWidth={3} />}
              {t(s.labelKey)}
            </motion.button>
          );
        })}
      </div>
      {/* מה אנחנו באמת מכסים — נאמר מראש ולא מתגלה אחרי חודש של פיד ריק */}
      <p className="mt-5 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
        {t("specCoverageNote")}
      </p>
    </div>
  );
}


function ReviewStep({ form }: { form: FormState }) {
  const t = useT();
  return (
    <div>
      <StepHeading titleKey="stepReviewTitle" descKey="stepReviewDesc" />
      <div className="space-y-3">
        <ReviewCard
          icon={<UserRound className="size-4" />}
          titleKey="reviewIdentity"
          lines={[
            form.fullName || undefined,
            form.idNumber ? `ת״ז ${form.idNumber}` : undefined,
            form.email || undefined,
            form.phone || undefined,
            form.city || undefined,
          ]}
        />
        <ReviewCard
          icon={<IdCard className="size-4" />}
          titleKey="reviewLicense"
          lines={[
            form.barNumber ? `# ${form.barNumber}` : undefined,
            form.barYear || undefined,
            form.barCardFile?.name,
          ]}
        />
        <ReviewCard
          icon={<GraduationCap className="size-4" />}
          titleKey="reviewEducation"
          lines={[form.university || undefined, form.gradYear || undefined, form.diplomaFile?.name]}
        />
        <ReviewCard
          icon={<Sparkles className="size-4" />}
          titleKey="reviewSpecialties"
          lines={[
            [...form.specialties]
              .map((id) => {
                const spec = SPECIALTIES.find((s) => s.id === id);
                return spec ? t(spec.labelKey) : id;
              })
              .join(" · "),
          ]}
        />
      </div>
    </div>
  );
}

function ReviewCard({
  icon,
  titleKey,
  lines,
}: {
  icon: ReactNode;
  titleKey: StringKey;
  lines: (string | null | undefined)[];
}) {
  const t = useT();
  const filtered = lines.filter(Boolean) as string[];
  return (
    <div className="liquid-glass rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-gold/15 text-gold">
          {icon}
        </span>
        <span className="text-[12px] font-semibold uppercase tracking-wider text-gold">
          {t(titleKey)}
        </span>
      </div>
      <div className="mt-2 space-y-0.5 ps-9 text-[13px] text-foreground/90">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground/70">—</p>
        ) : (
          filtered.map((line, i) => (
            <p key={i} className="truncate">
              {line}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- Upload tile ---------- */

function UploadTile({
  labelKey,
  value,
  onChange,
  icon,
}: {
  labelKey: StringKey;
  value: Uploaded | null;
  onChange: (v: Uploaded | null) => void;
  icon: ReactNode;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error(t("uploadHint"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        name: f.name,
        type: f.type,
        size: f.size,
        dataUrl: typeof reader.result === "string" ? reader.result : "",
      });
    };
    reader.readAsDataURL(f);
  }

  const hasFile = !!value;
  const isImage = value?.type.startsWith("image/");

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={pick}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-4 text-start transition active:scale-[0.99]",
          hasFile
            ? "border-gold/50 bg-gold/[0.06]"
            : "border-white/15 bg-foreground/[0.03] hover:bg-foreground/[0.06]",
        )}
      >
        <span
          className={cn(
            "relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl",
            hasFile ? "bg-gold/20 text-gold" : "bg-foreground/10 text-foreground/70",
          )}
        >
          {hasFile && isImage && value ? (
            <img
              src={value.dataUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : hasFile ? (
            <FileText className="size-5" />
          ) : (
            icon
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground">
            {hasFile && value ? value.name : t(labelKey)}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {hasFile && value
              ? `${Math.max(1, Math.round(value.size / 1024))} KB · ${t("uploadReplace")}`
              : t("uploadHint")}
          </span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/10 text-foreground/80">
          {hasFile ? (
            <Check className="size-4 text-gold" strokeWidth={2.6} />
          ) : (
            <Upload className="size-4" />
          )}
        </span>
      </button>
    </div>
  );
}
