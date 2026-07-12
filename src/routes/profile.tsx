import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  FileText,
  HelpCircle,
  LogOut,
  Repeat,
  Shield,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { Page, Stagger, Rise } from "../components/motion";
import { useAppStore } from "../lib/store";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

const items = [
  { icon: Bell, label: "התראות" },
  { icon: Shield, label: "פרטיות ואבטחה" },
  { icon: FileText, label: "תנאי שימוש" },
  { icon: HelpCircle, label: "עזרה ותמיכה" },
];

function Profile() {
  const navigate = useNavigate();
  const { role, setRole } = useAppStore();

  return (
    <AppShell withNav>
      <Page>
        <h1 className="pb-6 pt-8 text-2xl font-black text-foreground">פרופיל</h1>

        <Stagger className="space-y-4">
          <Rise>
            <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-luxe">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary text-lg font-black text-gold">
                {role === "lawyer" ? "עו״ד" : "אני"}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-foreground">
                  {role === "lawyer" ? "חשבון עורך דין" : "חשבון לקוח"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {role === "lawyer"
                    ? "קבלת פניות וניהול תיקים"
                    : "שיתוף מקרים ומעקב סטטוס"}
                </p>
              </div>
            </div>
          </Rise>

          <Rise>
            <button
              type="button"
              onClick={() => {
                setRole(null);
                navigate({ to: "/" });
              }}
              className="flex w-full items-center gap-3 rounded-3xl border border-border bg-card p-4 text-right shadow-luxe transition active:scale-[0.99]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-gold/12 text-gold">
                <Repeat className="size-5" />
              </span>
              <span className="flex-1 text-sm font-bold text-foreground">
                החלפת תפקיד
              </span>
              <ChevronLeft className="size-5 text-muted-foreground/50" />
            </button>
          </Rise>

          <Rise>
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-luxe">
              {items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.label}
                    type="button"
                    className={`flex w-full items-center gap-3 p-4 text-right transition active:bg-muted ${
                      i !== items.length - 1 ? "border-b border-border/60" : ""
                    }`}
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">
                      <Icon className="size-5" />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-foreground">
                      {it.label}
                    </span>
                    <ChevronLeft className="size-5 text-muted-foreground/50" />
                  </button>
                );
              })}
            </div>
          </Rise>

          <Rise>
            <button
              type="button"
              onClick={() => {
                setRole(null);
                navigate({ to: "/" });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-3xl border border-border bg-card p-4 text-sm font-bold text-destructive shadow-luxe transition active:scale-[0.99]"
            >
              <LogOut className="size-5" />
              התנתקות
            </button>
          </Rise>
        </Stagger>
      </Page>
      <BottomNav />
    </AppShell>
  );
}
