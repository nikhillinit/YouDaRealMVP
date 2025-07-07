import { EnhancedCohortEngine } from './enhanced-cohort-engine';
import { DeterministicReserveEngine } from './reserve-engine/deterministic-reserve-engine';
import { ExitValuationModel } from './exit-model/exit-valuation-model';
import { 
  EnhancedFundInputs, 
  ForecastResult, 
  ReserveOptimizationResult,
  ReserveSufficiencyAnalysis,
  PacingAnalysis,
  StageExitAnalysis 
} from '../shared/enhanced-types';

/**
 * Static class that serves as the main entry point for fund modeling
 * Orchestrates the various engines and models
 */
export class EnhancedFundModel {
  /**
   * Run a complete fund forecast
   */
  static async runForecast(inputs: EnhancedFundInputs): Promise<ForecastResult> {
    const engine = new EnhancedCohortEngine(inputs);
    return engine.generateForecast();
  }

  /**
   * Calculate reserve optimization
   */
  static async calculateReserveOptimization(
    inputs: EnhancedFundInputs,
    forecastResult: ForecastResult
  ): Promise<ReserveOptimizationResult> {
    const reserveEngine = new DeterministicReserveEngine();
    const exitModel = new ExitValuationModel();
    
    return reserveEngine.optimizeReserves(forecastResult, inputs, exitModel);
  }

  /**
   * Analyze reserve sufficiency
   */
  static async analyzeReserveSufficiency(
    inputs: EnhancedFundInputs,
    forecastResult: ForecastResult
  ): Promise<ReserveSufficiencyAnalysis> {
    const engine = new EnhancedCohortEngine(inputs);
    return engine.analyzeReserveSufficiency(forecastResult);
  }

  /**
   * Analyze pacing
   */
  static async analyzePacing(
    inputs: EnhancedFundInputs,
    forecastResult: ForecastResult,
    targetQuarters?: number
  ): Promise<PacingAnalysis> {
    const engine = new EnhancedCohortEngine(inputs);
    return engine.analyzePacing(forecastResult, targetQuarters);
  }

  /**
   * Analyze stage exits
   */
  static async analyzeStageExits(
    inputs: EnhancedFundInputs,
    forecastResult: ForecastResult
  ): Promise<StageExitAnalysis[]> {
    const engine = new EnhancedCohortEngine(inputs);
    return engine.analyzeStageExits(forecastResult);
  }

  /**
   * Get default fund inputs for a new fund
   */
  static getDefaultInputs(): EnhancedFundInputs {
    return {
      fundSize: 50,
      vintage: new Date().getFullYear(),
      fundLifeYears: 10,
      investmentPeriodYears: 5,
      managementFeeRate: 0.02,
      carryRate: 0.20,
      hurdleRate: 0.08,
      gpCommitment: 0.02,
      stageStrategies: [
        {
          stage: 'Pre-Seed',
          allocationPercent: 0.15,
          checkSize: 500000,
          targetOwnership: 0.08,
          targetCompanies: 15,
          followOnPercent: 0.5,
          reserveRatio: 0.4,
          entryValuation: 5000000
        },
        {
          stage: 'Seed',
          allocationPercent: 0.35,
          checkSize: 1500000,
          targetOwnership: 0.12,
          targetCompanies: 12,
          followOnPercent: 0.6,
          reserveRatio: 0.5,
          entryValuation: 15000000
        },
        {
          stage: 'Series A',
          allocationPercent: 0.35,
          checkSize: 3000000,
          targetOwnership: 0.10,
          targetCompanies: 6,
          followOnPercent: 0.7,
          reserveRatio: 0.6,
          entryValuation: 40000000
        },
        {
          stage: 'Series B',
          allocationPercent: 0.15,
          checkSize: 5000000,
          targetOwnership: 0.08,
          targetCompanies: 2,
          followOnPercent: 0.8,
          reserveRatio: 0.7,
          entryValuation: 100000000
        }
      ],
      graduationMatrix: {
        'Pre-Seed': { 'Seed': 0.6, 'Series A': 0.1, 'Exit': 0.1, 'Fail': 0.2 },
        'Seed': { 'Series A': 0.5, 'Series B': 0.05, 'Exit': 0.15, 'Fail': 0.3 },
        'Series A': { 'Series B': 0.4, 'Series C': 0.1, 'Exit': 0.25, 'Fail': 0.25 },
        'Series B': { 'Series C': 0.35, 'Series D+': 0.15, 'Exit': 0.35, 'Fail': 0.15 },
        'Series C': { 'Series D+': 0.3, 'Exit': 0.5, 'Fail': 0.2 },
        'Series D+': { 'Exit': 0.7, 'Fail': 0.3 }
      },
      exitProbabilityMatrix: {
        'Pre-Seed': { '0-1x': 0.7, '1-3x': 0.2, '3-10x': 0.08, '10x+': 0.02 },
        'Seed': { '0-1x': 0.6, '1-3x': 0.25, '3-10x': 0.12, '10x+': 0.03 },
        'Series A': { '0-1x': 0.5, '1-3x': 0.3, '3-10x': 0.15, '10x+': 0.05 },
        'Series B': { '0-1x': 0.4, '1-3x': 0.35, '3-10x': 0.2, '10x+': 0.05 },
        'Series C': { '0-1x': 0.3, '1-3x': 0.4, '3-10x': 0.25, '10x+': 0.05 },
        'Series D+': { '0-1x': 0.2, '1-3x': 0.45, '3-10x': 0.3, '10x+': 0.05 }
      }
    };
  }

  /**
   * Validate fund inputs
   */
  static validateInputs(inputs: EnhancedFundInputs): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate fund size
    if (inputs.fundSize <= 0 || inputs.fundSize > 10000) {
      errors.push('Fund size must be between $0 and $10B');
    }

    // Validate fee rates
    if (inputs.managementFeeRate < 0 || inputs.managementFeeRate > 0.05) {
      errors.push('Management fee rate must be between 0% and 5%');
    }

    if (inputs.carryRate < 0 || inputs.carryRate > 0.5) {
      errors.push('Carry rate must be between 0% and 50%');
    }

    // Validate stage strategies
    const totalAllocation = inputs.stageStrategies.reduce(
      (sum, strategy) => sum + strategy.allocationPercent, 
      0
    );
    
    if (Math.abs(totalAllocation - 1.0) > 0.001) {
      errors.push('Stage allocations must sum to 100%');
    }

    // Validate timeline
    if (inputs.investmentPeriodYears > inputs.fundLifeYears) {
      errors.push('Investment period cannot exceed fund life');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
