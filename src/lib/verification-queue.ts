// Client-side lawyer verification queue.
// NOTE: real server-side validation + persistent queue require enabling Lovable Cloud.
// This localStorage-backed store gives the UI/flow now; swap the read/write
// functions with server-fn calls once Cloud is on.

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface VerificationRecord {
  id: string;
  fullName: string;
  idNumber: string;
  email: string;
  phone: string;
  barNumber: string;
  barYear: string;
  university: string;
  gradYear: string;
  specialties: string[];
  otherSpecialty?: string;
  submittedAt: number;
  status: VerificationStatus;
  reviewedAt?: number;
}

const KEY = "justask-verification-queue";
const CHANNEL = "justask-verification-queue-changed";

function read(): VerificationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VerificationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(rows: VerificationRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
    window.dispatchEvent(new Event(CHANNEL));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function listVerifications(): VerificationRecord[] {
  return read().sort((a, b) => b.submittedAt - a.submittedAt);
}

export function enqueueVerification(
  data: Omit<VerificationRecord, "id" | "status" | "submittedAt">,
): VerificationRecord {
  const rec: VerificationRecord = {
    ...data,
    id: `ver_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    submittedAt: Date.now(),
    status: "pending",
  };
  const rows = read();
  rows.push(rec);
  write(rows);
  return rec;
}

export function updateVerification(id: string, status: VerificationStatus) {
  const rows = read().map((r) =>
    r.id === id ? { ...r, status, reviewedAt: Date.now() } : r,
  );
  write(rows);
}

export function removeVerification(id: string) {
  write(read().filter((r) => r.id !== id));
}

export function subscribeVerifications(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(CHANNEL, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANNEL, handler);
    window.removeEventListener("storage", handler);
  };
}
