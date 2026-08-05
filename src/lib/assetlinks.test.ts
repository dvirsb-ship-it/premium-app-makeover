import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/*
 * טביעת האצבע ב-assetlinks.json נכתבה פעם אחת כמחרוזת ריקה — ההחלפה
 * בסקריפט לא תפסה, הקובץ נפרס תקין מבחינת JSON, ורק צפייה בעיניים
 * גילתה זאת. תקלה כזו אינה מתגלה בבנייה: היא מתגלה כשמתקינים את
 * האפליקציה ורואים שורת כתובת מעל התוכן.
 */

const server = readFileSync("src/server.ts", "utf8");
const fp = server.match(/sha256_cert_fingerprints: \["([^"]*)"\]/)?.[1] ?? "";

describe("Digital Asset Links", () => {
  it("טביעת האצבע אינה ריקה", () => {
    expect(fp).not.toBe("");
  });

  it("הצורה היא SHA-256 תקין — 32 בתים בהקסה", () => {
    expect(fp).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  });

  it("שם החבילה תואם ל-twa-manifest", () => {
    const twa = JSON.parse(readFileSync("android/twa-manifest.json", "utf8"));
    expect(server).toContain(`package_name: "${twa.packageId}"`);
  });
});
