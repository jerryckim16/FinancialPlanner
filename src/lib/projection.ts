import type { Scenario, MonthlyCosts, YearProjection } from "../types";
import { calcFederalTax, calcStateTax } from "./tax";

export function calcAnnualCosts(costs: MonthlyCosts): number {
  const subscriptionTotal = costs.subscriptions.reduce(
    (sum, s) => sum + s.amount,
    0,
  );
  const monthly =
    costs.rent +
    costs.carPayment +
    costs.carInsurance +
    costs.food +
    costs.phone +
    costs.utilities +
    subscriptionTotal;
  return Math.round(monthly * 12 * 100) / 100;
}

export function runProjection(scenario: Scenario): YearProjection[] {
  const {
    currentAge,
    retirementAge,
    startingSavings,
    annualIncome,
    annualReturnRate,
    filingStatus,
    state,
    costs,
  } = scenario;

  const years: YearProjection[] = [];
  let netWorth = startingSavings;
  const annualCosts = calcAnnualCosts(costs);

  for (let age = currentAge; age <= retirementAge; age++) {
    const grossIncome = annualIncome;
    const federalTax = calcFederalTax(grossIncome, filingStatus);
    const stateTax = calcStateTax(grossIncome, state);
    const totalTax = federalTax + stateTax;
    const netIncome = grossIncome - totalTax;
    const annualSavings = netIncome - annualCosts;

    // Investment gains are calculated on net worth at the start of the year.
    // Savings from this year are added after gains for simplicity.
    const investmentGains = Math.round(netWorth * annualReturnRate * 100) / 100;

    netWorth =
      Math.round((netWorth + investmentGains + annualSavings) * 100) / 100;

    years.push({
      age,
      grossIncome,
      federalTax,
      stateTax,
      totalTax,
      netIncome,
      annualCosts,
      annualSavings,
      investmentGains,
      netWorth,
    });
  }

  return years;
}
