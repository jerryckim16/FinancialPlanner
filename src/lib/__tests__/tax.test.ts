import { describe, it, expect } from "vitest";
import { calcFederalTax, calcStateTax, calcTotalTax } from "../tax";

describe("calcFederalTax", () => {
  it("returns 0 when income is below standard deduction", () => {
    expect(calcFederalTax(10_000, "single")).toBe(0);
  });

  it("calculates correctly for single filer at $75,000", () => {
    // Taxable: 75000 - 14600 = 60400
    // 10% on first 11600 = 1160
    // 12% on next 35550 (47150 - 11600) = 4266
    // 22% on remaining 13250 (60400 - 47150) = 2915
    // Total = 8341
    expect(calcFederalTax(75_000, "single")).toBe(8341);
  });

  it("calculates correctly for married filer at $150,000", () => {
    // Taxable: 150000 - 29200 = 120800
    // 10% on first 23200 = 2320
    // 12% on next 71100 (94300 - 23200) = 8532
    // 22% on remaining 26500 (120800 - 94300) = 5830
    // Total = 16682
    expect(calcFederalTax(150_000, "married")).toBe(16682);
  });

  it("handles 0 income", () => {
    expect(calcFederalTax(0, "single")).toBe(0);
  });
});

describe("calcStateTax", () => {
  it("returns 0 for no-income-tax states", () => {
    expect(calcStateTax(100_000, "TX")).toBe(0);
    expect(calcStateTax(100_000, "FL")).toBe(0);
    expect(calcStateTax(100_000, "WA")).toBe(0);
  });

  it("calculates flat rate for CA", () => {
    // 100000 * 0.0725 = 7250
    expect(calcStateTax(100_000, "CA")).toBe(7250);
  });

  it("is case-insensitive", () => {
    expect(calcStateTax(100_000, "ca")).toBe(calcStateTax(100_000, "CA"));
  });

  it("defaults to 5% for unknown state codes", () => {
    expect(calcStateTax(100_000, "XX")).toBe(5000);
  });
});

describe("calcTotalTax", () => {
  it("sums federal and state", () => {
    const result = calcTotalTax({
      annualIncome: 75_000,
      filingStatus: "single",
      state: "TX",
    });
    expect(result.state).toBe(0);
    expect(result.federal).toBe(8341);
    expect(result.total).toBe(8341);
  });
});
