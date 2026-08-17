import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page } from "../components/motion";
import { useT } from "../lib/i18n";
import { useAppStore } from "../lib/store";
import { useRequireAuth } from "../lib/require-auth";
import {
  BIO_MAX_CHARS,
  readLawyerProfile,
  updateLawyerPresentation,
  uploadLawyerPhoto,
} from "../lib/db";

export const Route = createFileRoute("/settings/presentation")({
  component: PresentationSettings,
});

/**
 * איך עורך הדין מציג את עצמו — תמונה ושתי שורות.
 *
 * זה לא מסך קוסמטי. ההצעה היא רגע ההחלטה של הלקוח: הוא משווה כמה עורכי
 * דין זה לצד זה ובוחר אחד. פנים אמיתיות ומשפט בקולו הם אות האמון החזק
 * ביותר שיש שם — חזק יותר מכל שדה מובנה שנוסיף.
 *
 * **מסך נפרד מ"תחומי עיסוק" בכוונה.** תחום הוא טענה שנבדקת מול רישיון;
 * הצגה עצמית היא ביטוי. ערבוב שלהם היה גורר את עורך הדין דרך מסך אימות
 * בכל פעם שהוא רוצה להחליף תמונה.
 */
function PresentationSettings() {
  useRequireAuth();
  const t = useT();
  const { user } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [bio, setBio] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void readLawyerProfile(user.uid)
      .then((p) => {
        if (cancelled) return;
        setPhotoUrl(p?.photoUrl ?? "");
        setBio(p?.bio ?? "");
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) toast.error(t("loadFailedTitle"));
      });
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  async function pickPhoto(file: File) {
    if (!user) return;
    /*
     * הגבול נבדק כאן ולא רק בחוקים: קובץ של 12MB שנדחה בשרת אחרי
     * שהמשתמש חיכה להעלאה נראה כמו תקלה, לא כמו כלל.
     */
    if (file.size > 4 * 1024 * 1024) {
      toast.error(t("photoTooLarge"));
      return;
    }
    setBusy(true);
    try {
      const url = await uploadLawyerPhoto(user.uid, file);
      await updateLawyerPresentation(user.uid, { photoUrl: url });
      setPhotoUrl(url);
      toast.success(t("savedToast"));
    } catch {
      toast.error(t("actionFailedRetry"));
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!user) return;
    setBusy(true);
    try {
      await updateLawyerPresentation(user.uid, { photoUrl: "" });
      setPhotoUrl("");
    } catch {
      toast.error(t("actionFailedRetry"));
    } finally {
      setBusy(false);
    }
  }

  async function saveBio() {
    if (!user || busy || !loaded) return;
    setBusy(true);
    try {
      await updateLawyerPresentation(user.uid, { bio });
      toast.success(t("savedToast"));
    } catch {
      toast.error(t("actionFailedRetry"));
    } finally {
      setBusy(false);
    }
  }

  const initials = (user?.displayName ?? "").trim().slice(0, 2) || "עו";
  const left = BIO_MAX_CHARS - bio.length;

  return (
    <AppShell>
      <TopBar title={t("presentationTitle")} subtitle={t("presentationSub")} />
      <Page>
        <div className="workspace -mx-5 min-h-screen px-5 pb-28 pt-6">
          <section className="liquid-glass rounded-[26px] p-5">
            <p className="text-[13px] font-bold text-foreground">{t("photoLabel")}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {t("photoHelp")}
            </p>

            <div className="mt-4 flex items-center gap-4">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="size-20 shrink-0 rounded-[28%] object-cover shadow-[0_10px_24px_-12px_oklch(0.21_0.04_265/0.5)]"
                />
              ) : (
                <span className="chip-navy grid size-20 shrink-0 place-items-center rounded-[28%] text-2xl font-black">
                  {initials}
                </span>
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="tap flex items-center justify-center gap-2 rounded-2xl border border-border py-2.5 text-[13px] font-bold text-foreground disabled:opacity-40"
                >
                  <Camera className="size-4" strokeWidth={2} aria-hidden />
                  {photoUrl ? t("photoReplace") : t("photoUpload")}
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => void removePhoto()}
                    disabled={busy}
                    className="tap flex items-center justify-center gap-2 rounded-2xl py-2 text-[12.5px] font-semibold text-muted-foreground disabled:opacity-40"
                  >
                    <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                    {t("photoRemove")}
                  </button>
                )}
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickPhoto(f);
                e.target.value = "";
              }}
            />
          </section>

          <section className="liquid-glass mt-4 rounded-[26px] p-5">
            <p className="text-[13px] font-bold text-foreground">{t("bioLabel")}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {t("bioHelp")}
            </p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_CHARS))}
              rows={4}
              placeholder={t("bioPlaceholder")}
              aria-label={t("bioAria")}
              className="mt-3 w-full resize-none rounded-2xl border border-border bg-background/60 p-3 text-[14px] leading-relaxed text-foreground outline-none focus:border-gold/60"
            />
            {/* מונה ולא שגיאה: לומר "ארוך מדי" אחרי שכתב זה לבזבז לו את הזמן */}
            <p className="mt-1.5 text-end text-[11px] font-medium text-muted-foreground">
              {left}
            </p>
          </section>
        </div>

        <div className="sticky bottom-[var(--nav-inset)] border-t border-border bg-background/80 px-1 py-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => void saveBio()}
            disabled={busy || !loaded}
            className="btn-gold min-h-11 w-full rounded-2xl py-3.5 text-[15px] font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("saveAction")}
          </button>
        </div>
      </Page>
    </AppShell>
  );
}
