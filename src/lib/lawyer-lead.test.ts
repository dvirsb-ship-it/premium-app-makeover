import { describe, it, expect } from "vitest";
import { lawyerLeadProblem, normalizeLead, LEAD_SPECIALTIES } from "./lawyer-lead";
import { SPEC_IDS } from "./specialties";

const VALID = {
  fullName: "עו״ד דנה לוי",
  email: "Dana@Levi-Law.co.il",
  phone: "050-123-4567",
  specialty: "injury",
  barNumber: "45678",
  website: "",
};

describe("lawyerLeadProblem", () => {
  it("ליד תקין עובר", () => {
    expect(lawyerLeadProblem(VALID)).toBeNull();
  });

  it("שדה הדבש מלא = בוט — לפני כל בדיקה אחרת", () => {
    expect(lawyerLeadProblem({ ...VALID, website: "https://spam.example" })).toBe("bot");
  });

  it("כל 21 התחומים + אחר מתקבלים — הטופס והוולידציה לא ייפרדו", () => {
    expect(LEAD_SPECIALTIES).toHaveLength(SPEC_IDS.length + 1);
    for (const s of LEAD_SPECIALTIES) {
      expect(lawyerLeadProblem({ ...VALID, specialty: s })).toBeNull();
    }
  });

  it("תחום שלא ברשימה נדחה", () => {
    expect(lawyerLeadProblem({ ...VALID, specialty: "astrology" })).toBe("specialty");
  });

  it("שם קצר מדי או חסר", () => {
    expect(lawyerLeadProblem({ ...VALID, fullName: "א" })).toBe("name");
    expect(lawyerLeadProblem({ ...VALID, fullName: undefined })).toBe("name");
  });

  it("אימייל לא תקין", () => {
    expect(lawyerLeadProblem({ ...VALID, email: "not-an-email" })).toBe("email");
  });

  it("טלפון: מקפים ורווחים נסלחים, אורך לא", () => {
    expect(lawyerLeadProblem({ ...VALID, phone: "050 123 4567" })).toBeNull();
    expect(lawyerLeadProblem({ ...VALID, phone: "12345" })).toBe("phone");
  });

  it("מספר רישיון: ספרות בלבד", () => {
    expect(lawyerLeadProblem({ ...VALID, barNumber: "abc" })).toBe("barNumber");
    expect(lawyerLeadProblem({ ...VALID, barNumber: "1" })).toBe("barNumber");
  });

  it("קלט שאינו מחרוזות כלל אינו מפיל — רק נדחה", () => {
    expect(lawyerLeadProblem({ fullName: 42, email: null, phone: {}, specialty: [] })).toBe("name");
  });
});

describe("normalizeLead", () => {
  it("אימייל מונמך, טלפון ספרות בלבד, שוליים נחתכים", () => {
    const n = normalizeLead(VALID);
    expect(n.email).toBe("dana@levi-law.co.il");
    expect(n.phone).toBe("0501234567");
    expect(n.fullName).toBe("עו״ד דנה לוי");
  });
});
