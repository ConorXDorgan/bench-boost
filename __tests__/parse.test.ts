import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseWorkbook } from "@/lib/excel/parse";
import { deriveAvailability } from "@/lib/excel/availability";

const SAMPLE = path.resolve("data", "bench_sample_source.xlsx");

describe("parseWorkbook + deriveAvailability against the real sample", () => {
  it("parses 584 named resources and produces the expected bucket distribution", async () => {
    const buffer = await readFile(SAMPLE);
    const { snapshotDate, rows } = await parseWorkbook(buffer);

    expect(rows.length).toBe(584);

    const counts = { available: 0, coming: 0, not_available: 0 };
    let unknownCount = 0;
    for (const row of rows) {
      const result = deriveAvailability(
        {
          staffableStatus: row.fields.staffableStatus,
          staffableDetailedStatus: row.fields.staffableDetailedStatus,
          firstStaffableCategory: row.fields.firstStaffableCategory,
          firstStaffableDate: row.fields.firstStaffableDate,
        },
        snapshotDate,
      );
      counts[result.bucket]++;
      if (result.unknown) unknownCount++;
    }

    expect(counts.available).toBe(4);
    expect(counts.coming).toBe(50);
    expect(counts.not_available).toBe(530);
    expect(unknownCount).toBe(0);
  });
});
