import { describe, it, expect } from "vitest";
import { selfieVideoPath, selfieVideoProblem, SELFIE_VIDEO_MAX_BYTES } from "./verification-queue";

describe("selfieVideoProblem", () => {
  it("סרטון תקין עובר", () => {
    expect(selfieVideoProblem({ type: "video/mp4", size: 12 * 1024 * 1024 })).toBeNull();
    expect(selfieVideoProblem({ type: "video/quicktime", size: 40 * 1024 * 1024 })).toBeNull();
  });

  it("חסר — הבעיה הנפוצה, עם הודעה משלה", () => {
    expect(selfieVideoProblem(null)).toBe("missing");
  });

  it("קובץ שאינו וידאו נדחה — תמונה של תעודה אינה סרטון פנים", () => {
    expect(selfieVideoProblem({ type: "image/jpeg", size: 1024 })).toBe("not-video");
    expect(selfieVideoProblem({ type: "application/pdf", size: 1024 })).toBe("not-video");
  });

  it("הגבול תואם את חוקי ה-Storage — הלקוח לא מבטיח מה שהשרת ידחה", () => {
    expect(SELFIE_VIDEO_MAX_BYTES).toBe(80 * 1024 * 1024);
    expect(selfieVideoProblem({ type: "video/mp4", size: SELFIE_VIDEO_MAX_BYTES + 1 })).toBe(
      "too-big",
    );
    expect(selfieVideoProblem({ type: "video/mp4", size: SELFIE_VIDEO_MAX_BYTES })).toBeNull();
  });
});

describe("selfieVideoPath", () => {
  it("נגזר מהסיומת, תחת תיקיית האימות של המשתמש", () => {
    expect(selfieVideoPath("abc", "clip.mov")).toBe("verifications/abc/selfieVideo.mov");
  });

  it("שם קובץ בלי סיומת מקבל mp4 — לא נתיב שבור", () => {
    expect(selfieVideoPath("abc", "video")).toBe("verifications/abc/selfieVideo.video");
    expect(selfieVideoPath("abc", "")).toBe("verifications/abc/selfieVideo.mp4");
  });

  it("תווים מוזרים בסיומת מנוקים — הנתיב חייב להתאים לחוק selfieVideo\\..*", () => {
    expect(selfieVideoPath("abc", "clip.M P4!")).toBe("verifications/abc/selfieVideo.mp4");
  });
});
