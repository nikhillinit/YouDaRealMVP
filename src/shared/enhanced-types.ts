// src/shared/enhanced-types.ts

import { 
  FundStage, 
  CompanyStatus, 
  ExitType, 
  PerformanceCase,
  PortfolioCompany,
  TimelineMetrics,
  WaterfallSummary
} from './types';

// ===== ENHANCED FUND MODEL TYPES =====

export interface EnhancedFundModel {
  runForecast: (inputs: EnhancedFundInputs) => Promise<ForecastResult>;
  calculateWaterfall: (distributions: number[], inputs: EnhancedFundInputs) => WaterfallSummary;
  generateTimeline: (portfolio: PortfolioCompany[], inputs: EnhancedFundInputs) => TimelineMetrics[];
}

export interface EnhancedCohortEngine {
  new (inputs: EnhancedFundInputs): EnhancedCohortEngineInstance;
}

export interface EnhancedCohortEngineInstance {
  generateForecast: () => ForecastResult;
  analyzeReserveSufficiency: (result: ForecastResult) => ReserveSufficiencyAnalysis;
  analyzePacing: (result: ForecastResult, targetQuarters?: number) => PacingAnalysis;
  analyzeStageExits: (result: ForecastResult) => StageExitAnalysis[];
  calculateOptimalReserveAllocation: (
    result: ForecastResult,
    targetRatio: number,
    exitProbabilityMatrix: ExitProbabilityMatrix
  ) => ReserveOptimizationResult;
}

// ===== ENHANCED INPUT TYPES =====

export interface EnhancedFundInputs {
  // Basic Fund Parameters
  fundName: string;
  fundSize: number; // in millions
  currency?: 'USD' | 'EUR' | 'GBP';
  vintage?: number;
  
  // Fee Structure
  managementFeeRate: number;
  carryRate: number;
  gpCommitment: number;
  hurdleRate: number;
  catchUpRate?: number;
  
  // Timeline
  investmentPeriodYears: number;
  fundLifeYears: number;
  extensionYears?: number;
  
  // Investment Strategy
  stageStrategies: StageStrategy[];
  graduationMatrix: GraduationMatrix;
  exitProbabilityMatrix: ExitProbabilityMatrix;
  
  // Advanced Parameters
  recyclingEnabled?: boolean;
  recyclingCap?: number; // % of fund size
  europeanWaterfall?: boolean;
  managementFeeBase?: 'committed' | 'invested' | 'custom';
}

// ===== STRATEGY TYPES =====

export interface StageStrategy {
  stage: FundStage;
  allocationPercent: number;
  checkSize: number;
  targetCompanies: number;
  followOnPercent: number;
  targetOwnership: number;
  entryValuation: number;
  reserveRatio?: number;
}

// ===== PROBABILITY MATRICES =====

export interface GraduationMatrix {
  'Pre-Seed': {
    'Seed': number;
    'Failed': number;
  };
  'Seed': {
    'Series A': number;
    'Failed': number;
  };
  'Series A': {
    'Series B': number;
    'Exit': number;
    'Failed': number;
  };
  'Series B': {
    'Series C': number;
    'Exit': number;
    'Failed': number;
  };
  'Series C': {
    'Series D+': number;
    'Exit': number;
    'Failed': number;
  };
  'Series D+': {
    'Exit': number;
    'Failed': number;
  };
}

export interface ExitProbabilityMatrix {
  'Pre-Seed': StageExitProbabilities;
  'Seed': StageExitProbabilities;
  'Series A': StageExitProbabilities;
  'Series B': StageExitProbabilities;
  'Series C': StageExitProbabilities;
  'Series D+': StageExitProbabilities;
}

export interface StageExitProbabilities {
  great: number;
  good: number;
  mediocre: number;
  failure: number;
}

// ===== ANALYSIS RESULT TYPES =====

export interface ReserveSufficiencyAnalysis {
  totalReservesNeeded: number;
  totalReservesAllocated: number;
  sufficiencyRatio: number;
  companiesNeedingReserves: number;
  reserveShortfall: number;
  recommendedReserveRatio: number;
  stageBreakdown: StageReserveAnalysis[];
}

export interface StageReserveAnalysis {
  stage: FundStage;
  reservesNeeded: number;
  reservesAllocated: number;
  sufficiency: number;
  companiesCount: number;
}

export interface PacingAnalysis {
  totalInvested: number;
  avgQuarterlyDeployment: number;
  pacingScore: number;
  deploymentVariance: number;
  frontLoadingRatio: number;
  deploymentEfficiency: number;
  quarterlyDeployments: number[];
  recommendedPacing: number[];
  deploymentRate?: number;
  projectedDeploymentCompletion?: number;
  deploymentByStage?: { [stage: string]: number };
}

export interface StageExitAnalysis {
  stage: FundStage;
  totalCompanies: number;
  exitedCompanies: number;
  exitRate: number;
  averageExitMultiple: number;
  averageTimeToExit: number;
  exitTypeBreakdown: {
    acquisition: number;
    ipo: number;
    secondary: number;
    acquihire: number;
    shutdown: number;
  };
  performanceBreakdown: {
    great: number;
    good: number;
    mediocre: number;
    failure: number;
  };
}

// ===== RESERVE OPTIMIZATION TYPES =====

export interface ReserveOptimizationResult {
  optimizedAllocations: ReserveAllocation[];
  totalReservesAllocated: number;
  expectedReturns: number;
  improvementOverBaseline: number;
  recommendations: string[];
}

export interface ReserveAllocation {
  companyId: string;
  companyName: string;
  currentStage: FundStage;
  recommendedReserve: number;
  exitMOICOnReserves: number;
  probabilityAdjustedReturn: number;
  allocationRationale: string;
}

// ===== FORECAST RESULT TYPES =====

export interface ForecastResult {
  portfolio: PortfolioCompany[];
  timeline: TimelineMetrics[];
  waterfall: WaterfallSummary;
  irr: {
    gross: number;
    net: number;
  };
  moic: {
    gross: number;
    net: number;
  };
  dpi: number;
  rvpi: number;
  tvpi: number;
  totalInvested: number;
  totalDistributed: number;
  portfolioValue: number;
  managementFees: number;
  carriedInterest: number;
  recycledCapital?: number;
  fundMetrics?: FundMetrics;
}

export interface FundMetrics {
  capitalCalled: number;
  capitalDistributed: number;
  capitalRemaining: number;
  dryPowder: number;
  totalValue: number;
  netAssetValue: number;
  totalManagementFees: number;
  totalCarriedInterest: number;
  lpNetProceeds: number;
  gpTotalCompensation: number;
}

// ===== MONTE CARLO TYPES =====

export interface MonteCarloConfig {
  iterations: number;
  parameters: MonteCarloParameter[];
  seed?: number;
}

export interface MonteCarloParameter {
  name: keyof EnhancedFundInputs;
  distribution: 'uniform' | 'normal' | 'lognormal';
  min: number;
  max: number;
  mean?: number;
  stdDev?: number;
}

export interface MonteCarloResult {
  iterations: number;
  results: ForecastResult[];
  statistics: {
    netIRR: StatisticalSummary;
    netMOIC: StatisticalSummary;
    dpi: StatisticalSummary;
    tvpi: StatisticalSummary;
  };
  percentiles: {
    p10: ForecastResult;
    p25: ForecastResult;
    p50: ForecastResult;
    p75: ForecastResult;
    p90: ForecastResult;
  };
  convergenceAchieved: boolean;
}

export interface StatisticalSummary {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

// ===== VALIDATION TYPES =====

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
  value?: any;
  suggestion?: string;
}
