import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  IdCard,
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
import { cn } from "../lib/utils";

export const Route = createFileRoute("/lawyer-onboarding")({
  head: () => ({
    meta: [
      { title: "JustAsk — Lawyer verification" },
      {
        name: "description",
        content: "Verify your identity, bar license and specialties to join the JustAsk lawyer roster.",
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

type SpecId =
  | "injury"
  | "employment"
  | "estate"
  | "civil"
  | "family"
  | "criminal"
  | "commercial"
  | "tax";

const SPECIALTIES: { id: SpecId; labelKey: StringKey }[] = [
  { id: "injury", labelKey: "specInjury" },
  { id: "employment", labelKey: "specEmployment" },
  { id: "estate", labelKey: "specEstate" },
  { id: "civil", labelKey: "specCivil" },
  { id: "family", labelKey: "specFamily" },
  { id: "criminal", labelKey: "specCriminal" },
  { id: "commercial", labelKey: "specCommercial" },
  { id: "tax", labelKey: "specTax" },
];

type StepId = "intro" | "identity" | "bar" | "education" | "specialties" | "review";
const STEPS: StepId[] = ["intro", "identity", "bar", "education", "specialties", "review"];

interface FormState {
  fullName: string;
  idNumber: string;
  email: string;
  phone: string;
  barNumber: string;
  barYear: string;
  barCardFile: string | null;
  university: string;
  gradYear: string;
  diplomaFile: string | null;
  specialties: Set<SpecId>;
}

function LawyerOnboarding() {
  useRequireAuth();
  const navigate = useNavigate();
  const { dir } = useSettings();
  const t = useT();
  const rtl = dir === "rtl";

  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<FormState>({
    fullName: "",
    idNumber: "",
    email: "",
    phone: "",
    barNumber: "",
    barYear: "",
    barCardFile: null,
    university: "",
    gradYear: "",
    diplomaFile: null,
    specialties: new Set<SpecId>(["injury"]),
  });

  const step = STEPS[stepIdx];
  const contentSteps = STEPS.slice(1); // exclude intro from progress
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

  const canProceed = useMemo(() => {
    switch (step) {
      case "intro":
        return true;
      case "identity":
        return (
          form.fullName.trim().length > 1 &&
          /^\d{9}$/.test(form.idNumber.trim()) &&
          form.email.trim().length > 3 &&
          form.phone.trim().length > 5
        );
      case "bar":
        return form.barNumber.trim().length >= 3 && form.barYear.trim().length === 4 && !!form.barCardFile;
      case "education":
        return form.university.trim().length > 1 && form.gradYear.trim().length === 4 && !!form.diplomaFile;
      case "specialties":
        return form.specialties.size > 0;
      case "review":
        return true;
    }
  }, [step, form]);

  function goNext() {
    if (!canProceed) return;
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
  }
  function goBack() {
    if (stepIdx === 0) {
      navigate({ to: "/" });
      return;
    }
    setStepIdx(stepIdx - 1);
  }

  function submit() {
    try {
      sessionStorage.setItem(
        "justask-lawyer-specialties",
        JSON.stringify([...form.specialties]),
      );
      sessionStorage.setItem(
        "justask-lawyer-verify",
        JSON.stringify({
          fullName: form.fullName,
          idNumber: form.idNumber,
          email: form.email,
          phone: form.phone,
          barNumber: form.barNumber,
          barYear: form.barYear,
          university: form.university,
          gradYear: form.gradYear,
          submittedAt: Date.now(),
        }),
      );
    } catch {
      /* ignore */
    }
    toast.success(t("verifySuccess"));
    navigate({ to: "/lawyer" });
  }

  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  return (
    <AppShell>
      <TopBar
        title={t("lawyerOnboardTitle")}
        subtitle={
          step === "intro"
            ? t("lawyerOnboardSubtitle")
            : t("lawyerVerifyStepOf")
                .replace("{n}", String(contentIdx + 1))
                .replace("{total}", String(contentSteps.length))
        }
        onBack={goBack}
      />

      {/* Progress bar */}
      {step !== "intro" && (
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
              <SpecialtiesStep selected={form.specialties} toggle={toggleSpec} />
            )}
            {step === "review" && <ReviewStep form={form} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 pb-6">
        {step === "review" ? (
          <>
            <motion.button
              type="button"
              onClick={submit}
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
            disabled={!canProceed}
            whileTap={canProceed ? { scale: 0.97 } : undefined}
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold transition",
              canProceed ? "btn-gold" : "liquid-glass text-muted-foreground",
            )}
          >
            {step === "intro" ? t("lawyerVerifyBegin") : t("nextStep")}
            <NextIcon className="size-5" strokeWidth={2.4} />
          </motion.button>
        )}
      </div>
    </AppShell>
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

function Field({
  labelKey,
  children,
}: {
  labelKey: StringKey;
  children: ReactNode;
}) {
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
          onChange={(name) => update("barCardFile", name)}
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
          onChange={(name) => update("diplomaFile", name)}
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
      <p className="mt-4 text-[11px] text-muted-foreground">
        {selected.size} · {t("stepSpecTitle")}
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
          lines={[form.fullName, `ת״ז ${form.idNumber}`, form.email, form.phone]}
        />
        <ReviewCard
          icon={<IdCard className="size-4" />}
          titleKey="reviewLicense"
          lines={[`# ${form.barNumber}`, form.barYear, form.barCardFile ?? "—"]}
        />
        <ReviewCard
          icon={<GraduationCap className="size-4" />}
          titleKey="reviewEducation"
          lines={[form.university, form.gradYear, form.diplomaFile ?? "—"]}
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
        {lines.filter(Boolean).map((line, i) => (
          <p key={i} className="truncate">{line}</p>
        ))}
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
  value: string | null;
  onChange: (name: string | null) => void;
  icon: ReactNode;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onChange(f.name);
  }

  const hasFile = !!value;

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
            "grid size-11 shrink-0 place-items-center rounded-xl",
            hasFile ? "bg-gold/20 text-gold" : "bg-foreground/10 text-foreground/70",
          )}
        >
          {hasFile ? <FileText className="size-5" /> : icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground">
            {hasFile ? value : t(labelKey)}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {hasFile ? t("uploadReplace") : t("uploadHint")}
          </span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/10 text-foreground/80">
          {hasFile ? <Check className="size-4 text-gold" strokeWidth={2.6} /> : <Upload className="size-4" />}
        </span>
      </button>
    </div>
  );
}
