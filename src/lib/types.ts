export type Role = "client" | "lawyer";

export type CaseStatus =
  | "validating"
  | "matching"
  | "has_interest"
  | "connected";

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
}
