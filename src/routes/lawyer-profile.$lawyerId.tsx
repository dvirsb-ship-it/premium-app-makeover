import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Award,
  Briefcase,
  MessageCircle,
  Phone,
  Star,
  X,
} from "lucide-react";
import { useAppStore } from "../lib/store";
import { useSettings } from "../lib/settings";
import lawyerPortrait from "../assets/lawyer-portrait.jpg";

export const Route = createFileRoute("/lawyer-profile/$lawyerId")({
  component: LawyerProfile,
});

function LawyerProfile() {
  const { lawyerId } = Route.useParams();
  const navigate = useNavigate();
  const { cases } = useAppStore();
  const { dir } = useSettings();
  const flip = dir === "rtl" ? "" : "rotate-180";

  const chosenCase = cases.find((c) => c.chosenLawyerId === lawyerId);
  const lawyer =
    chosenCase?.interested.find((l) => l.id === lawyerId) ??
    cases.flatMap((c) => c.interested).find((l) => l.id === lawyerId);

  if (!lawyer) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#0a0a0c] px-6 text-center text-white">
        <div>
          <p className="text-lg font-semibold">עורך הדין לא נמצא</p>
          <Link
            to="/cases"
            className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-[#0a0a0c]"
          >
            לתיקים שלי
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[100dvh] overflow-x-hidden text-white"
      style={{
        background:
          "radial-gradient(ellipse 65% 55% at 15% 52%, rgba(212,175,55,0.20)), radial-gradient(ellipse 52% 48% at 83% 26%, rgba(78,110,180,0.18)), radial-gradient(ellipse 44% 52% at 56% 92%, rgba(20,25,50,0.55)), #060812",
      }}
    >
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative h-[430px] w-full overflow-hidden"
      >
        <img
          src={lawyerPortrait}
          alt={lawyer.name}
          width={1024}
          height={1280}
          className="h-full w-full object-cover object-[center_20%]"
        />
        {/* Bottom gradient fades into background */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,8,18,0) 0%, rgba(6,8,18,0.55) 52%, #060812 100%)",
          }}
        />

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-6">
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => navigate({ to: "/cases" })}
            className="liquid-glass grid size-11 place-items-center rounded-2xl"
            aria-label="חזרה"
          >
            <ArrowLeft className={`size-5 text-white ${flip}`} />
          </motion.button>
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="liquid-glass grid size-11 place-items-center rounded-2xl"
            aria-label="סגירה"
          >
            <X className="size-5 text-white" />
          </motion.button>
        </div>
      </motion.div>

      {/* Identity section (overlaps hero) */}
      <div className="relative z-10 -mt-24 px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative flex items-center justify-center"
        >
          {/* Laurel left */}
          <svg
            className="absolute opacity-60"
            style={{ right: "calc(50% + 78px)" }}
            width="58"
            height="73"
            viewBox="0 0 58 73"
            fill="none"
          >
            <path
              d="M52 4 C 30 12, 14 28, 8 56 C 20 60, 38 52, 50 32"
              stroke="#d4af37"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
            <path d="M44 12 l-3 6 M36 20 l-3 6 M28 30 l-4 5 M22 42 l-5 4" stroke="#d4af37" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {/* Laurel right */}
          <svg
            className="absolute opacity-60"
            style={{ left: "calc(50% + 78px)" }}
            width="58"
            height="73"
            viewBox="0 0 58 73"
            fill="none"
          >
            <path
              d="M6 4 C 28 12, 44 28, 50 56 C 38 60, 20 52, 8 32"
              stroke="#d4af37"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
            <path d="M14 12 l3 6 M22 20 l3 6 M30 30 l4 5 M36 42 l5 4" stroke="#d4af37" strokeWidth="1.2" strokeLinecap="round" />
          </svg>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-[28px] font-medium text-white"
          >
            {lawyer.name.replace(/^עו״ד\s*/, "")}
          </motion.h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-1 text-center text-[15px]"
          style={{ color: "rgba(235,220,205,0.55)" }}
        >
          {lawyer.firm} · {lawyer.specialty}
        </motion.p>

        {/* Achievements pill */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.66, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 flex justify-center"
        >
          <button
            type="button"
            className="liquid-glass flex h-[54px] items-center justify-center gap-2 rounded-[27px] px-6 text-[18px] font-medium text-white"
          >
            <Award className="size-[18px] text-[#d4af37]" strokeWidth={1.8} />
            <span>{lawyer.years} שנות ניסיון</span>
          </button>
        </motion.div>
      </div>

      {/* Stats grid */}
      <div className="relative z-10 mt-6 grid grid-cols-3 gap-3 px-4">
        {[
          {
            n: `${lawyer.reviews}`,
            label: "לקוחות מרוצים",
            delay: 0.74,
            icon: Star,
          },
          {
            n: `${lawyer.rating}`,
            label: "דירוג ממוצע",
            delay: 0.8,
            icon: Award,
          },
          {
            n: `${Math.round(lawyer.years * 8.4)}`,
            label: "תיקים שנוהלו",
            delay: 0.86,
            icon: Briefcase,
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: s.delay,
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex flex-col items-center rounded-[24px] px-3 py-5 text-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-white/6 ring-1 ring-white/10">
                <Icon className="size-6 text-[#d4af37]" strokeWidth={1.6} />
              </span>
              <p className="mt-3 text-[25px] font-medium leading-none text-white">
                {s.n}
              </p>
              <p
                className="mt-1.5 text-[12px] leading-tight"
                style={{ color: "#BAAA9A8C" }}
              >
                {s.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* About / specialty card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.94, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-4 mt-3 flex items-center gap-4 rounded-[24px] p-4"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <span className="grid size-[92px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f1e4c3] via-[#d4af37] to-[#a8862a] text-3xl font-black text-[#1a1305] shadow-lg shadow-[#d4af37]/30">
          {lawyer.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-white/70">התמחות</p>
          <p className="mt-0.5 text-[19px] font-medium text-white">
            {lawyer.specialty}
          </p>
          <p
            className="mt-2 line-clamp-2 text-[13px] leading-relaxed"
            style={{ color: "#BAAA9A8C" }}
          >
            {lawyer.blurb}
          </p>
        </div>
      </motion.div>

      {/* Contact CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.02, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-4 mt-4 flex gap-3 pb-10"
      >
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#f1e4c3] via-[#d4af37] to-[#a8862a] py-4 text-[15px] font-bold text-[#1a1305] shadow-lg shadow-[#d4af37]/30"
        >
          <MessageCircle className="size-4" strokeWidth={2.4} />
          שליחת הודעה
        </button>
        <button
          type="button"
          className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-semibold text-white"
        >
          <Phone className="size-4 text-[#d4af37]" strokeWidth={2.2} />
          התקשרות
        </button>
      </motion.div>
    </div>
  );
}
