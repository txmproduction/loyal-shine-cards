import { describe, expect, it } from "vitest";
import { normalizePhone, phoneKey } from "./phone";

describe("phone", () => {
  it("accepte le format 06…", () => expect(normalizePhone("06 95 53 66 15")).toBe("0695536615"));
  it("accepte +33", () => expect(normalizePhone("+33 6 95 53 66 15")).toBe("0695536615"));
  it("accepte +41 (Suisse)", () => expect(normalizePhone("+41 79 123 45 67")).toBe("0791234567"));
  it("refuse un numéro trop court", () => expect(normalizePhone("06123")).toBeNull());
  it("06… et +33 6… sont le même client", () =>
    expect(phoneKey("0695536615")).toBe(phoneKey("+33695536615")));
});
