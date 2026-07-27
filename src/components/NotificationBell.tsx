import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useAppStore } from "../lib/store";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";

/** פעמון התראות עם מונה שלא-נקראו — מוביל למרכז ההתראות. */
export function NotificationBell({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { notifications } = useAppStore();
  const t = useT();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/notifications" })}
      className={cn(
        "liquid-glass relative grid size-11 place-items-center rounded-full text-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70",
        className,
      )}
      aria-label={t("notifAria")}
    >
      <Bell className="size-5" strokeWidth={2} />
      {unread > 0 && (
        <span className="absolute -end-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
