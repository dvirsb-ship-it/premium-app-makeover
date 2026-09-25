import { createFileRoute } from "@tanstack/react-router";
import { CaseJournal } from "../components/CaseJournal";
import type { Case } from "../lib/types";

/*
 * מעבדת עיצוב — dev בלבד (25/9/2026).
 *
 * שלושת מצבי הכרטיס הראשי + השבבים + הכפתורים, במתכוני המחלקות
 * האמיתיים של index.tsx, בלי Firebase ובלי auth — כדי שאפשר יהיה
 * לצלם ולהשוות מצב בהיר/כהה בשניות בזמן עבודת עיצוב. בפרודקשן
 * הראוט מחזיר null.
 */
export const Route = createFileRoute("/design-lab")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: DesignLab,
});

function Card(props: {
  halo?: "green" | "gold";
  offer?: boolean;
  good?: boolean;
  chip: string;
  chipClass: string;
  title: string;
  sub: string;
  cta?: string;
}) {
  const card = (
    <div
      className={[
        "anchor liquid-glass glass-raised relative w-full overflow-hidden rounded-[26px] text-start",
        props.good ? "glass-good" : "",
        props.offer ? "glass-offer" : "",
      ].join(" ")}
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${props.chipClass}`}>
            {props.chip}
          </span>
        </div>
        <div className="mt-2 text-lg font-bold text-foreground">{props.title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{props.sub}</div>
        {props.cta ? (
          <button className="btn-gold tap mt-4 w-full rounded-2xl py-3 text-sm font-bold">
            {props.cta}
          </button>
        ) : null}
      </div>
    </div>
  );
  if (!props.halo) return card;
  return <div className={props.halo === "gold" ? "good-halo halo-gold" : "good-halo"}>{card}</div>;
}

function DesignLab() {
  if (!import.meta.env.DEV) return null;
  return (
    <div dir="rtl" className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="text-xl font-extrabold text-foreground">מעבדת עיצוב — איים כהים</div>

        <Card
          good
          chip="נשלחה פנייה"
          chipClass="bg-secondary text-foreground"
          title="תאונת דרכים · מרץ 2026"
          sub="עורך הדין בודק ניגוד עניינים · נעדכן ברגע שיש חדש"
        />

        <Card
          halo="green"
          good
          chip="בתהליך"
          chipClass="bg-secondary text-foreground"
          title="תאונת דרכים · מרץ 2026"
          sub="הסיכום נשלח ל-3 עורכי דין · חלון של 48 שעות"
        />

        <Card
          halo="gold"
          good
          offer
          chip="התקבלה הצעה"
          chipClass="offer-chip"
          title="תאונת דרכים · מרץ 2026"
          sub="עורך דין הגיש הצעה וממתין לתשובתך"
          cta="לצפייה בהצעה ולהשוואה"
        />

        <div className="flex items-center gap-2">
          <span className="chip-navy rounded-full px-3 py-1.5 text-xs font-bold">נזקי גוף</span>
          <span className="chip-gold rounded-full px-3 py-1.5 text-xs font-bold">הצעה: 12%</span>
          <button className="btn-gold tap rounded-2xl px-5 py-2.5 text-sm font-bold">פעולה ראשית</button>
        </div>

        <div className="note-gold rounded-2xl p-4 text-sm text-foreground">
          הערת מסמך על קלף — נגיעת הזהב של שפת המסמך נשארת.
        </div>

        <div className="text-xl font-extrabold text-foreground">יומן התיק (סינתזה)</div>
        <CaseJournal
          caseDoc={{
            id: "design-lab-fake",
            title: "תאונת דרכים · מרץ 2026",
            category: "injury",
            summary: "",
            createdAt: Date.now() - 26 * 60 * 60 * 1000,
            status: "awaiting_selection",
            interested: [],
            summaryApprovedAt: Date.now() - 25 * 60 * 60 * 1000,
          } as Case}
        />
      </div>
    </div>
  );
}
