import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Home, FolderOpen, Scale, User } from "lucide-react";
import { cn } from "../lib/utils";
import { useAppStore } from "../lib/store";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";

const clientTabs: { to: string; key: StringKey; icon: typeof Home }[] = [
  { to: "/", key: "navHome", icon: Home },
  { to: "/cases", key: "navCases", icon: FolderOpen },
  { to: "/profile", key: "navProfile", icon: User },
];

const lawyerTabs: { to: string; key: StringKey; icon: typeof Home }[] = [
  { to: "/lawyer", key: "navLawyerCases", icon: Scale },
  { to: "/profile", key: "navProfile", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const { role } = useAppStore();
  const t = useT();
  const tabs = role === "lawyer" ? lawyerTabs : clientTabs;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-4">
      <nav className="liquid-glass flex w-full max-w-md items-center justify-around rounded-[26px] px-2 py-2">
        {tabs.map((tab) => {
          const active =
            tab.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2"
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] shadow-lg shadow-gold/25"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 size-5 transition-colors",
                  active ? "text-[#0F172A]" : "text-muted-foreground",
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cn(
                  "relative z-10 text-[11px] font-semibold transition-colors",
                  active ? "text-[#0F172A]" : "text-muted-foreground",
                )}
              >
                {t(tab.key)}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
