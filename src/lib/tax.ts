// ---------------------------------------------------------------------------
// Federal income tax — 2024 brackets + standard deduction
// ---------------------------------------------------------------------------

import type { Scenario } from "../types";

interface Bracket {
  upTo: number; // top of bracket (Infinity for last)
  rate: number;
}

const FEDERAL_BRACKETS_SINGLE: Bracket[] = [
  { upTo: 11_600, rate: 0.1 },
  { upTo: 47_150, rate: 0.12 },
  { upTo: 100_525, rate: 0.22 },
  { upTo: 191_950, rate: 0.24 },
  { upTo: 243_725, rate: 0.32 },
  { upTo: 609_350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

const FEDERAL_BRACKETS_MARRIED: Bracket[] = [
  { upTo: 23_200, rate: 0.1 },
  { upTo: 94_300, rate: 0.12 },
  { upTo: 201_050, rate: 0.22 },
  { upTo: 383_900, rate: 0.24 },
  { upTo: 487_450, rate: 0.32 },
  { upTo: 731_200, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

const STANDARD_DEDUCTION: Record<string, number> = {
  single: 14_600,
  married: 29_200,
};

function calcBracketTax(taxableIncome: number, brackets: Bracket[]): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let prev = 0;

  for (const { upTo, rate } of brackets) {
    const taxableInBracket = Math.min(taxableIncome, upTo) - prev;
    if (taxableInBracket <= 0) break;
    tax += taxableInBracket * rate;
    prev = upTo;
  }

  return tax;
}

export function calcFederalTax(
  grossIncome: number,
  filingStatus: "single" | "married",
): number {
  const deduction = STANDARD_DEDUCTION[filingStatus];
  const taxable = Math.max(0, grossIncome - deduction);
  const brackets =
    filingStatus === "single"
      ? FEDERAL_BRACKETS_SINGLE
      : FEDERAL_BRACKETS_MARRIED;
  return Math.round(calcBracketTax(taxable, brackets) * 100) / 100;
}

// ---------------------------------------------------------------------------
// State income tax — flat-rate approximation per state (2024)
// States with no income tax use 0. Others use a single effective rate that
// roughly matches a ~$80k income level. Good enough for planning estimates.
// ---------------------------------------------------------------------------

const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.05,
  AK: 0,
  AZ: 0.025,
  AR: 0.044,
  CA: 0.0725,
  CO: 0.044,
  CT: 0.05,
  DE: 0.055,
  FL: 0,
  GA: 0.055,
  HI: 0.072,
  ID: 0.058,
  IL: 0.0495,
  IN: 0.0315,
  IA: 0.044,
  KS: 0.057,
  KY: 0.04,
  LA: 0.0425,
  ME: 0.0615,
  MD: 0.0575,
  MA: 0.05,
  MI: 0.0425,
  MN: 0.0685,
  MS: 0.05,
  MO: 0.048,
  MT: 0.059,
  NE: 0.0564,
  NV: 0,
  NH: 0,
  NJ: 0.0545,
  NM: 0.049,
  NY: 0.0645,
  NC: 0.045,
  ND: 0.0195,
  OH: 0.035,
  OK: 0.0475,
  OR: 0.0875,
  PA: 0.0307,
  RI: 0.0475,
  SC: 0.065,
  SD: 0,
  TN: 0,
  TX: 0,
  UT: 0.0465,
  VT: 0.066,
  VA: 0.0575,
  WA: 0,
  WV: 0.055,
  WI: 0.053,
  WY: 0,
  DC: 0.065,
};

export function calcStateTax(grossIncome: number, stateCode: string): number {
  const rate = STATE_TAX_RATES[stateCode.toUpperCase()] ?? 0.05;
  return Math.round(grossIncome * rate * 100) / 100;
}

export function calcTotalTax(scenario: Pick<Scenario, "annualIncome" | "filingStatus" | "state">): {
  federal: number;
  state: number;
  total: number;
} {
  const federal = calcFederalTax(scenario.annualIncome, scenario.filingStatus);
  const state = calcStateTax(scenario.annualIncome, scenario.state);
  return { federal, state, total: federal + state };
}

export const STATE_CODES = Object.keys(STATE_TAX_RATES).sort();
