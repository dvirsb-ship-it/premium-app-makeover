import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BadgeCheck, Check, Flag, MapPin, MessageCircle, Phone, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page } from "../components/motion";
import { useAppStore } from "../lib/store";
import { useT, translate } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import {
  caseImageUrl,
  categoryHasStatutoryCap,
  readCaseMemo,
  PLTD_MAX_PERCENT,
  readCaseRaw,
  submitAppeal,
  type CaseImage,
  type ExpensesTerm,
  type FeeModel,
} from "../lib/db";
import { normalizePhone } from "../lib/auth-service";
import {
  watchMyVerification,
  type VerificationStatus,
} from "../lib/verification-queue";

const offerInputCls =
  "block w-full rounded-2xl border border-white/10 bg-foreground/[0.04] px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-gold/50";

export const Route = createFileRoute("/lawyer-case/$caseId")({
  component: LawyerCaseDetail,
});

type ConnectedCase = {
  title: string;
  category: string;
  summary: string;
  clientContact?: { name: string; phone: string; email: string };
};

function LawyerCaseDetail() {

  useRequireAuth();  const { caseId } = Route.useParams();
  const router = useRouter();
  const navigate = useNavigate();
  const { getFeedCase, expressInterest, user } = useAppStore();
  const t = useT();
  const item = getFeedCase(caseId);
  const urgentSeed = translate("urgent", "he");

  // סטטוס האימות — הבעת עניין פתוחה רק לעו"ד מאושר (נאכף גם בחוקי השרת)
  const [verStatus, setVerStatus] = useState<VerificationStatus | null>(null);
  useEffect(() => {
    if (!user) return;
    return watchMyVerification(user.uid, (rec) => setVerStatus(rec?.status ?? null));
  }, [user]);

  // תמונות התיק: עד החיבור — הגרסה המצונזרת בלבד; אחרי החיבור — המקור
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const [imgOriginals, setImgOriginals] = useState(false);

  // תיק שכבר חובר אליי לא מופיע בפיד — נטען ישירות כדי להציג את פרטי הלקוח
  const [connected, setConnected] = useState<ConnectedCase | null>(null);
  useEffect(() => {
    if (item || !user) return;
    void readCaseRaw(caseId)
      .then(async (raw) => {
        if (raw && raw.chosenLawyerId === user.uid) {
          setConnected({
            title: raw.title,
            category: raw.category,
            summary: raw.summary,
            clientContact: raw.clientContact,
          });
          const imgs = (raw.images ?? []) as CaseImage[];
          const urls = await Promise.all(
            imgs.map((im) => caseImageUrl(im.origPath).catch(() => "")),
          );
          setImgUrls(urls.filter(Boolean));
          setImgOriginals(true);
        }
      })
      .catch(() => {});
  }, [item, user, caseId]);

  // פרטי הוולידציה המלאים — הבסיס המשפטי, תאריך, נזק ותיעוד
  const [details, setDetails] = useState<{
    legalBasis?: string;
    incidentDate?: string;
    damageType?: string;
    hasDocumentation?: boolean;
  } | null>(null);
  useEffect(() => {
    if (!item) return;
    void readCaseRaw(caseId)
      .then(async (raw) => {
        if (raw) {
          setDetails({
            legalBasis: raw.legalBasis,
            incidentDate: raw.incidentDate,
            damageType: raw.damageType,
            hasDocumentation: raw.hasDocumentation,
          });
          // עד החיבור נטענת הגרסה המצונזרת בלבד — המקור חסום בחוקי Storage
          const imgs = (raw.images ?? []) as CaseImage[];
          const urls = await Promise.all(
            imgs.map((im) => caseImageUrl(im.censPath).catch(() => "")),
          );
          setImgUrls(urls.filter(Boolean));
        }
      })
      .catch(() => {});
  }, [item, caseId]);

  // טופס ההצעה שנשלחת עם הבעת העניין — מובנה, כדי שהלקוח יוכל להשוות
  const [offerOpen, setOfferOpen] = useState(false);
  const [model, setModel] = useState<FeeModel>("contingency");
  const [amount, setAmount] = useState("");
  const [noWin, setNoWin] = useState(true);
  const [expenses, setExpenses] = useState<ExpensesTerm>("advanced");
  const [expensesEstimate, setExpensesEstimate] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");

  /*
   * בתביעות פלת"ד שכר הטרחה מוגבל בכללי לשכת עורכי הדין. הקטגוריה "נזיקין
   * ותאונות" כוללת גם תיקים שאינם תאונת דרכים, ולכן זו אזהרה ולא חסימה —
   * עורך הדין הוא שיודע אם התיק שלו כפוף לתקרה.
   */
  const capWarning =
    model === "contingency" &&
    Number(amount) > PLTD_MAX_PERCENT &&
    categoryHasStatutoryCap(item?.category ?? "");

  // התזכיר המשפטי המלא — עבודת המשפטן שה-AI כתב, נחסך מעורך הדין
  const [memo, setMemo] = useState<string | null>(null);
  const [memoOpen, setMemoOpen] = useState(false);
  useEffect(() => {
    if (!item) return;
    void readCaseMemo(caseId).then(setMemo).catch(() => {});
  }, [item, caseId]);

  // ערעור על הוולידציה
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSent, setAppealSent] = useState(false);

  function sendAppeal() {
    const reason = appealReason.trim();
    if (!reason || !user || !item) return;
    void submitAppeal({
      caseId: item.id,
      caseTitle: item.title,
      lawyerId: user.uid,
      lawyerName: user.displayName || "עורך דין",
      reason,
    })
      .then(() => {
        setAppealSent(true);
        setAppealOpen(false);
        toast.success(t("appealSentMsg"));
      })
      .catch(() => toast.error(t("authErrGeneric")));
  }

  function damageLabel(v?: string) {
    if (v === "financial") return t("damageFinancial");
    if (v === "both") return t("damageBoth");
    return t("damageBody");
  }

  if (!item && connected) {
    const c = connected.clientContact;
    return (
      <AppShell bare>
        <Page className="flex min-h-screen flex-col">
          <TopBar title={t("leadDetailsTitle")} subtitle={connected.category} />
          <div className="flex-1 px-5 pt-6">
            <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success">
              {t("connectedWithLawyer")}
            </span>
            <h2 className="mt-4 text-xl font-black leading-snug text-foreground">
              {connected.title}
            </h2>
            <div className="liquid-glass mt-6 rounded-3xl p-5">
              <h3 className="text-sm font-bold text-foreground">{t("caseDescriptionHeader")}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                {connected.summary}
              </p>
            </div>

            {imgUrls.length > 0 && (
              <div className="liquid-glass mt-4 rounded-3xl p-4">
                <p className="text-[13px] font-bold text-foreground">{t("lawyerImagesHeader")}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {imgOriginals ? t("lawyerImagesOriginalsNote") : t("lawyerImagesNote")}
                </p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {imgUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={url} alt="" className="h-24 w-24 rounded-2xl border border-border object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-gold" strokeWidth={2.2} />
                <h3 className="text-sm font-bold text-foreground">{t("clientContactHeader")}</h3>
              </div>
              <p className="mt-2 text-[15px] font-semibold text-foreground">
                {c?.name || "—"}
              </p>
              {c?.phone && (
                <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
                  {c.phone}
                </p>
              )}
              {c?.email && (
                <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
                  {c.email}
                </p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (c?.phone) {
                      const digits = normalizePhone(c.phone).replace("+", "");
                      window.open(`https://wa.me/${digits}`, "_blank", "noopener");
                    } else if (c?.email) {
                      window.location.href = `mailto:${c.email}`;
                    }
                  }}
                  className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                >
                  <MessageCircle className="size-4 text-gold" />
                  {t("messageAction")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (c?.phone) window.location.href = `tel:${normalizePhone(c.phone)}`;
                  }}
                  className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                >
                  <Phone className="size-4 text-gold" />
                  {t("callAction")}
                </button>
              </div>
            </div>
          </div>
        </Page>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell>
        <TopBar title={t("leadNotFound")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">{t("leadNotExist")}</p>
          <Link
            to="/lawyer"
            className="btn-gold rounded-2xl px-6 py-3 text-sm font-bold"
          >
            {t("toLeadsList")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const canExpress = verStatus === "approved";

  return (
    <AppShell bare>
      <Page className="flex min-h-screen flex-col">
        <TopBar title={t("leadDetailsTitle")} subtitle={item.category} />

        <div className="flex-1 px-5 pt-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold">
              {item.category}
            </span>
            {item.urgency === urgentSeed && (
              <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-bold text-destructive">
                {t("urgent")}
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
              {item.interestedCount} {t("interestedSuffix")}
            </span>
            <span>{item.postedAgo}</span>
          </div>

          <div className="liquid-glass mt-6 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-foreground">{t("caseDescriptionHeader")}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          </div>

          {details && (details.legalBasis || details.incidentDate) && (
            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-gold" strokeWidth={2.2} />
                <h3 className="text-sm font-bold text-foreground">{t("whyApprovedHeader")}</h3>
              </div>
              {details.legalBasis && (
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {details.legalBasis}
                </p>
              )}
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-foreground/[0.04] px-2 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("incidentDateLabel")}</dt>
                  <dd className="mt-0.5 text-[12px] font-bold text-foreground" dir="ltr">{details.incidentDate || "—"}</dd>
                </div>
                <div className="rounded-2xl bg-foreground/[0.04] px-2 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("damageTypeLabel")}</dt>
                  <dd className="mt-0.5 text-[12px] font-bold text-foreground">{damageLabel(details.damageType)}</dd>
                </div>
                <div className="rounded-2xl bg-foreground/[0.04] px-2 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("documentationLabel")}</dt>
                  <dd className="mt-0.5 text-[12px] font-bold text-foreground">{details.hasDocumentation ? t("docYes") : t("docNo")}</dd>
                </div>
              </dl>
            </div>
          )}

          {memo && (
            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <button
                type="button"
                onClick={() => setMemoOpen((v) => !v)}
                className="flex w-full items-center gap-2 text-start"
              >
                <Scale className="size-4 shrink-0 text-gold" strokeWidth={2.2} />
                <span className="flex-1 text-sm font-bold text-foreground">{t("memoHeader")}</span>
                <span className="text-[11px] font-semibold text-gold">
                  {memoOpen ? t("memoHide") : t("memoShow")}
                </span>
              </button>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t("memoSub")}
              </p>
              {memoOpen && (
                <p className="mt-3 whitespace-pre-line border-t border-border pt-3 text-[13px] leading-relaxed text-foreground/90">
                  {memo}
                </p>
              )}
            </div>
          )}

          {imgUrls.length > 0 && (
            <div className="liquid-glass mt-4 rounded-3xl p-4">
              <p className="text-[13px] font-bold text-foreground">{t("lawyerImagesHeader")}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {t("lawyerImagesNote")}
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {imgUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <img src={url} alt="" className="h-24 w-24 rounded-2xl border border-border object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/8 px-4 py-3 text-xs leading-relaxed text-foreground">
            <Scale className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>{t("interestNotice")}</span>
          </div>

          {/* ערעור על הוולידציה — הוולידציה הכפולה של קהילת עורכי הדין */}
          {!appealSent && (
            <div className="mt-3 pb-2">
              {appealOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="liquid-glass rounded-2xl p-4"
                >
                  <p className="text-[13px] font-bold text-foreground">{t("appealLink")}</p>
                  <textarea
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    rows={3}
                    placeholder={t("appealPlaceholder")}
                    className={`${offerInputCls} mt-2 resize-none`}
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={sendAppeal}
                      disabled={!appealReason.trim()}
                      className="btn-gold flex-1 rounded-2xl py-2.5 text-[13px] font-bold disabled:opacity-40"
                    >
                      {t("appealSend")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppealOpen(false)}
                      className="liquid-glass flex-1 rounded-2xl py-2.5 text-[13px] font-semibold text-foreground"
                    >
                      {t("cancelAction")}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAppealOpen(true)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <Flag className="size-3.5" strokeWidth={2.2} />
                  {t("appealLink")}
                </button>
              )}
            </div>
          )}
        </div>

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
                {t("interestSent")}
              </motion.div>
            ) : canExpress && offerOpen ? (
              <motion.div
                key="offer"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass max-h-[60vh] space-y-2.5 overflow-y-auto rounded-3xl p-4"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-gold" strokeWidth={2.2} />
                  <p className="text-[13px] font-bold text-foreground">{t("offerTitle")}</p>
                </div>

                {/* מודל שכר הטרחה — בנזקי גוף אחוזים מהפיצוי הם הנפוץ */}
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-foreground/80">
                    {t("offerModelLabel")}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["contingency", "hourly", "fixed"] as FeeModel[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        className={`rounded-2xl border px-2 py-2.5 text-[12px] font-bold transition ${
                          model === m
                            ? "border-gold/60 bg-gold/15 text-gold"
                            : "border-white/10 bg-foreground/[0.04] text-muted-foreground"
                        }`}
                      >
                        {t(m === "contingency" ? "feeContingency" : m === "hourly" ? "feeHourly" : "feeFixed")}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-foreground/80">
                    {t(model === "contingency" ? "offerPercentLabel" : model === "hourly" ? "offerHourlyLabel" : "offerFixedLabel")}
                  </span>
                  <div className="relative">
                    <input
                      className={offerInputCls}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={model === "contingency" ? "12" : model === "hourly" ? "600" : "8000"}
                    />
                    <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-[13px] font-bold text-muted-foreground">
                      {model === "contingency" ? "%" : "\u20aa"}
                    </span>
                  </div>
                </label>

                {/* התקרה בפלת"ד היא חובה שבדין — מזהירים, לא חוסמים */}
                {capWarning && (
                  <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
                    <Scale className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <p className="text-[11px] leading-relaxed text-foreground">{t("offerCapWarning")}</p>
                  </div>
                )}

                {model === "contingency" && (
                  <button
                    type="button"
                    onClick={() => setNoWin((v) => !v)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-foreground/[0.04] p-3 text-start"
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${
                        noWin ? "border-gold bg-gold text-background" : "border-white/25"
                      }`}
                    >
                      {noWin && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="text-[12px] font-semibold text-foreground">{t("offerNoWinLabel")}</span>
                  </button>
                )}

                {/* ההוצאות הנלוות — כאן לקוחות נכווים, ולכן זה שדה נפרד */}
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-foreground/80">
                    {t("offerExpensesLabel")}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["included", "advanced", "client"] as ExpensesTerm[]).map((x) => (
                      <button
                        key={x}
                        type="button"
                        onClick={() => setExpenses(x)}
                        className={`rounded-2xl border px-2 py-2.5 text-[11px] font-bold leading-tight transition ${
                          expenses === x
                            ? "border-gold/60 bg-gold/15 text-gold"
                            : "border-white/10 bg-foreground/[0.04] text-muted-foreground"
                        }`}
                      >
                        {t(x === "included" ? "expensesIncluded" : x === "advanced" ? "expensesAdvanced" : "expensesClient")}
                      </button>
                    ))}
                  </div>
                  {expenses !== "included" && (
                    <input
                      className={`${offerInputCls} mt-2`}
                      value={expensesEstimate}
                      onChange={(e) => setExpensesEstimate(e.target.value)}
                      placeholder={t("offerExpensesPh")}
                    />
                  )}
                </div>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerDurationLabel")}</span>
                  <input
                    className={offerInputCls}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder={t("offerDurationPh")}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerNoteLabel")}</span>
                  <textarea
                    className={`${offerInputCls} resize-none`}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("offerNotePh")}
                  />
                </label>

                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                  {t("offerNonBinding")}
                </p>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  disabled={!(Number(amount) > 0)}
                  onClick={() => {
                    expressInterest(item.id, {
                      model,
                      amount: Number(amount),
                      noWinNoFee: model === "contingency" ? noWin : false,
                      expenses,
                      expensesEstimate: expenses === "included" ? "" : expensesEstimate.trim(),
                      duration: duration.trim(),
                      note: note.trim(),
                    });
                    window.setTimeout(() => router.history.back(), 900);
                  }}
                  className="btn-gold w-full rounded-2xl py-3.5 text-[15px] font-bold disabled:opacity-40"
                >
                  {t("offerSend")}
                </motion.button>
              </motion.div>
            ) : canExpress ? (
              <motion.button
                key="express"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOfferOpen(true)}
                className="btn-gold w-full rounded-2xl py-4 text-base font-bold"
              >
                {t("imInterested")}
              </motion.button>
            ) : (
              <motion.div
                key="locked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <ShieldCheck className="size-4.5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground">
                    {t("interestLockedTitle")}
                  </p>
                  {verStatus === "pending" ? (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {t("interestLockedPending")}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/lawyer-onboarding" })}
                      className="mt-0.5 text-[12px] font-bold text-gold underline-offset-2 hover:underline"
                    >
                      {t("interestLockedCta")}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Page>
    </AppShell>
  );
}
