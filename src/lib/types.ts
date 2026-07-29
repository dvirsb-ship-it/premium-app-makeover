export type Role = "client" | "lawyer";

export type CaseStatus =
  | "validating"
  | "matching"
  | "has_interest"
  | "connected"
  | "rejected";

export interface Lawyer {
  id: string;
  name: string;
  firm: string;
  specialty: string;
  rating: number;
  reviews: number;
  years: number;
  initials: string;
  blurb: string;
}

export interface ChatMessage {
  id: string;
  from: "assistant" | "user";
  text: string;
  /** תמונות שצורפו להודעה — כתובות blob מקומיות לתצוגה בלבד. */
  images?: string[];
  /** תיאור התמונות עבור ה-AI. נשלח אליו כטקסט ואינו מוצג למשתמש. */
  aiNote?: string;
}

export interface Case {
  id: string;
  title: string;
  category: string;
  summary: string;
  createdAt: number;
  status: CaseStatus;
  interested: Lawyer[];
  chosenLawyerId?: string;
  /** הצעות שצירפו עורכי דין להבעת העניין, לפי מזהה עו"ד. */
  offers?: Record<string, { fee: string; duration: string; note: string; at: number }>;
}

export interface FeedCase {
  id: string;
  title: string;
  category: string;
  summary: string;
  location: string;
  postedAgo: string;
  urgency: "רגיל" | "דחוף";
  interestedCount: number;
  expressed?: boolean;
  /** התאמה לעו"ד הצופה — לפי קרבה והתמחות. */
  match?: "high" | "medium";
}
