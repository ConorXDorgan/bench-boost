import { describe, expect, it } from "vitest";
import { deriveAvailability } from "@/lib/excel/availability";

const FIXED_NOW = new Date("2026-05-07T00:00:00Z");

function daysAhead(days: number): Date {
  return new Date(FIXED_NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

describe("deriveAvailability", () => {
  it("rule 1: detailed status 'Now Staffable' -> available", () => {
    const result = deriveAvailability(
      {
        staffableStatus: "Staffable",
        staffableDetailedStatus: "Now Staffable",
        firstStaffableCategory: "Resource Now Staffable 0-7 Days",
        firstStaffableDate: daysAhead(3),
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("available");
    expect(result.unknown).toBe(false);
  });

  it("rule 2: detailed status 'Coming Staffable' -> coming", () => {
    const result = deriveAvailability(
      {
        staffableStatus: "Staffable",
        staffableDetailedStatus: "Coming Staffable",
        firstStaffableCategory: "Resource First Staffable Day 4-5 Weeks",
        firstStaffableDate: daysAhead(28),
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("coming");
    expect(result.weeksOut).toBe(4);
  });

  it("rule 3: detailed null but category starts with 'Resource Now Staffable' -> available", () => {
    const result = deriveAvailability(
      {
        staffableStatus: null,
        staffableDetailedStatus: null,
        firstStaffableCategory: "Resource Now Staffable 15-21 Days",
        firstStaffableDate: daysAhead(18),
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("available");
  });

  it("rule 4: category 'Resource First Staffable Day' within 8 weeks -> coming", () => {
    const result = deriveAvailability(
      {
        staffableStatus: null,
        staffableDetailedStatus: null,
        firstStaffableCategory: "Resource First Staffable Day 4-5 Weeks",
        firstStaffableDate: daysAhead(35),
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("coming");
  });

  it("rule 4 negative: category 'Resource First Staffable Day' beyond 8 weeks -> not_available", () => {
    const result = deriveAvailability(
      {
        staffableStatus: "Not Staffable",
        staffableDetailedStatus: "Not Staffable",
        firstStaffableCategory: "Resource First Staffable Day >12 Weeks",
        firstStaffableDate: daysAhead(120),
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("not_available");
    expect(result.unknown).toBe(false);
  });

  it("rule 5: explicit 'Not Staffable' -> not_available, not unknown", () => {
    const result = deriveAvailability(
      {
        staffableStatus: "Not Staffable",
        staffableDetailedStatus: "Not Staffable",
        firstStaffableCategory: "Resource First Staffable Day 5-12 Weeks",
        firstStaffableDate: daysAhead(70),
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("not_available");
    expect(result.unknown).toBe(false);
  });

  it("rule 6: all status fields null -> not_available with unknown=true", () => {
    const result = deriveAvailability(
      {
        staffableStatus: null,
        staffableDetailedStatus: null,
        firstStaffableCategory: null,
        firstStaffableDate: null,
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("not_available");
    expect(result.unknown).toBe(true);
    expect(result.weeksOut).toBeNull();
  });

  it("trims whitespace and treats empty string as null", () => {
    const result = deriveAvailability(
      {
        staffableStatus: "  ",
        staffableDetailedStatus: "  Now Staffable  ",
        firstStaffableCategory: "",
        firstStaffableDate: null,
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("available");
  });

  it("past first staffable date with 'Resource First Staffable Day' category does not promote to coming", () => {
    const result = deriveAvailability(
      {
        staffableStatus: "Not Staffable",
        staffableDetailedStatus: "Not Staffable",
        firstStaffableCategory: "Resource First Staffable Day 1-7 Days",
        firstStaffableDate: daysAhead(-10),
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("not_available");
  });

  it("date exactly 8 weeks out is still 'coming'", () => {
    const result = deriveAvailability(
      {
        staffableStatus: null,
        staffableDetailedStatus: null,
        firstStaffableCategory: "Resource First Staffable Day 5-12 Weeks",
        firstStaffableDate: daysAhead(56),
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("coming");
    expect(result.weeksOut).toBe(8);
  });

  it("date 9 weeks out falls out of 'coming' window", () => {
    const result = deriveAvailability(
      {
        staffableStatus: null,
        staffableDetailedStatus: null,
        firstStaffableCategory: "Resource First Staffable Day 5-12 Weeks",
        firstStaffableDate: daysAhead(63),
      },
      FIXED_NOW,
    );
    expect(result.bucket).toBe("not_available");
  });
});
