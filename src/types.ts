export interface Scenario {
  currentAge: number;
  retirementAge: number;
  startingSavings: number;
  annualIncome: number;
  annualReturnRate: number; // e.g. 0.07 = 7%
  filingStatus: "single" | "married";
  state: string; // 2-letter code
  costs: MonthlyCosts;
}

export interface MonthlyCosts {
  rent: number;
  carPayment: number;
  carInsurance: number;
  food: number;
  phone: number;
  utilities: number;
  subscriptions: Subscription[];
}

export interface Subscription {
  name: string;
  amount: number;
}

export interface YearProjection {
  age: number;
  grossIncome: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  netIncome: number;
  annualCosts: number;
  annualSavings: number;
  investmentGains: number;
  netWorth: number;
}
