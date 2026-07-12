import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, MapPin, Scale, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { Page, Stagger, Rise, Pressable } from "../components/motion";
import { Seal } from "../components/Seal";
import { useAppStore } from "../lib/store";

export const Route = createFileRoute("/lawyer")({
  component: LawyerFeed,
});

function LawyerFeed() {
  const navigate = useNavigate();
  const { feed } = useAppStore();

  return (
    <AppShell withNav bare>
      <Page>
        {/* Header */}
        <div className="relative overflow-hidden rounded-b-[2rem] bg-primary px-6 pb-8 pt-12 text-primary-foreground shadow-luxe">
          <div className="pointer-events-none absolute -left-16 -top-10 size-52 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <Seal size={52} float={false} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-light text-gold-light/80">שלום, עו״ד</p>
              <h1 className="text-xl font-black">פניות רלוונטיות עבורך</h1>
            </div>
          </div>
          <div className="relative mt-6 flex gap-3">
            <div className="flex-1 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-black text-gold">{feed.length}</p>
              <p className="text-xs text-gold-light/80">פניות חדשות</p>
            </div>
            <div className="flex-1 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-black text-gold">
                {feed.filter((f) => f.expressed).length}
              </p>
              <p className="text-xs text-gold-light/80">הבעת עניין</p>
            </div>
          </div>
        </div>

        <div className="px-5 pt-6">
          <Stagger className="space-y-4">
            {feed.map((f) => (
              <Rise key={f.id}>
                <Pressable
                  onClick={() =>
                    navigate({
                      to: "/lawyer-case/$caseId",
                      params: { caseId: f.id },
                    })
                  }
                  className="w-full rounded-3xl border border-border bg-card p-5 shadow-luxe"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-bold text-primary">
                        {f.category}
                      </span>
                      {f.urgency === "דחוף" && (
                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
                          דחוף
                        </span>
                      )}
                    </div>
                    <ChevronLeft className="size-5 shrink-0 text-muted-foreground/50" />
                  </div>
                  <h3 className="mt-3 text-base font-bold leading-snug text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {f.summary}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-gold" />
                      {f.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5 text-gold" />
                      {f.interestedCount} מתעניינים
                    </span>
                    <span className="ms-auto">{f.postedAgo}</span>
                  </div>
                  {f.expressed && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-xs font-bold text-success">
                      <Scale className="size-3.5" />
                      הבעת עניין — ממתין לבחירת הלקוח
                    </div>
                  )}
                </Pressable>
              </Rise>
            ))}
          </Stagger>
        </div>
      </Page>
      <BottomNav />
    </AppShell>
  );
}
