import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Home, FolderOpen, Scale, User } from "lucide-react";
import { cn } from "../lib/utils";
import { useAppStore } from "../lib/store";

const clientTabs = [
  { to: "/", label: "ראשי", icon: Home },
  { to: "/cases", label: "התיקים שלי", icon: FolderOpen },
  { to: "/profile", label: "פרופיל", icon: User },
];

const lawyerTabs = [
  { to: "/lawyer", label: "תיקים", icon: Scale },
  { to: "/profile", label: "פרופיל", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const { role } = useAppStore();
  const tabs = role === "lawyer" ? lawyerTabs : clientTabs;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-4">
      <nav className="flex w-full max-w-md items-center justify-around rounded-3xl border border-border/60 bg-card/80 px-2 py-2 shadow-luxe backdrop-blur-xl">
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
                  className="absolute inset-0 rounded-2xl bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 size-5 transition-colors",
                  active ? "text-gold" : "text-muted-foreground",
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cn(
                  "relative z-10 text-[11px] font-semibold transition-colors",
                  active ? "text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
