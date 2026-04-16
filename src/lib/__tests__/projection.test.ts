import { describe, it, expect } from "vitest";
import { calcAnnualCosts, runProjection } from "../projection";
import type { Scenario, MonthlyCosts } from "../../types";

const baseCosts: MonthlyCosts = {
  rent: 1500,
  carPayment: 300,
  carInsurance: 120,
  food: 500,
  phone: 60,
  utilities: 150,
  subscriptions: [
    { name: "Netflix", amount: 15 },
    { name: "YouTube", amount: 14 },
  ],
};

const baseScenario: Scenario = {
  currentAge: 25,
  retirementAge: 30,
  startingSavings: 10_000,
  annualIncome: 80_000,
  annualReturnRate: 0.07,
  filingStatus: "single",
  state: "TX",
  costs: baseCosts,
};

describe("calcAnnualCosts", () => {
  it("correctly sums monthly costs * 12", () => {
    // (1500 + 300 + 120 + 500 + 60 + 150 + 15 + 14) * 12 = 2659 * 12 = 31908
    expect(calcAnnualCosts(baseCosts)).toBe(31_908);
  });

  it("handles zero subscriptions", () => {
    const costs: MonthlyCosts = { ...baseCosts, subscriptions: [] };
    // (1500 + 300 + 120 + 500 + 60 + 150) * 12 = 2630 * 12 = 31560
    expect(calcAnnualCosts(costs)).toBe(31_560);
  });
});

describe("runProjection", () => {
  it("returns correct number of years", () => {
    const result = runProjection(baseScenario);
    // ages 25, 26, 27, 28, 29, 30 = 6 years
    expect(result).toHaveLength(6);
    expect(result[0].age).toBe(25);
    expect(result[5].age).toBe(30);
  });

  it("starts net worth above starting savings after first year (when saving positive)", () => {
    const result = runProjection(baseScenario);
    // With 80k income in TX (no state tax), net income should exceed costs
    expect(result[0].netWorth).toBeGreaterThan(baseScenario.startingSavings);
  });

  it("net worth grows monotonically when annual savings > 0", () => {
    const result = runProjection(baseScenario);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].netWorth).toBeGreaterThan(result[i - 1].netWorth);
    }
  });

  it("calculates investment gains on prior net worth", () => {
    const result = runProjection(baseScenario);
    // First year: gains on starting savings
    expect(result[0].investmentGains).toBeCloseTo(10_000 * 0.07, 2);
  });

  it("shows 0 state tax in Texas", () => {
    const result = runProjection(baseScenario);
    expect(result[0].stateTax).toBe(0);
  });

  it("handles scenario where costs exceed income", () => {
    const expensiveScenario: Scenario = {
      ...baseScenario,
      annualIncome: 20_000,
      costs: { ...baseCosts, rent: 5000 },
    };
    const result = runProjection(expensiveScenario);
    // Should have negative savings
    expect(result[0].annualSavings).toBeLessThan(0);
  });
});
