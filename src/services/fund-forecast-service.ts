// src/services/fund-forecast-service.ts

import { 
  EnhancedFundInputs, 
  ForecastResult, 
  PortfolioCompany, 
  TimelineMetrics,
  WaterfallSummary,
  FundStage,
  GraduationMatrix,
  ExitProbabilityMatrix
} from '../shared/enhanced-types';
import { EnhancedCohortEngine } from '../core/enhanced-cohort-engine';

export class FundForecastService {
  private static instance: FundForecastService;
  
  private constructor() {}
  
  static getInstance(): FundForecastService {
    if (!FundForecastService.instance) {
      FundForecastService.instance = new FundForecastService();
    }
    return FundForecastService.instance;
  }
  
  /**
   * Run a complete fund forecast
   */
  async runForecast(inputs: EnhancedFundInputs): Promise<ForecastResult> {
    try {
      // Validate inputs
      this.validateInputs(inputs);
      
      // Create cohort engine instance
      const engine = new EnhancedCohortEngine(inputs);
      
      // Generate forecast
      const forecast = engine.generateForecast();
      
      // Post-process results
      return this.postProcessForecast(forecast, inputs);
    } catch (error) {
      console.error('Forecast error:', error);
      throw new Error(`Forecast failed: ${error.message}`);
    }
  }
  
  /**
   * Generate portfolio companies based on stage strategies
   */
  generatePortfolio(inputs: EnhancedFundInputs): PortfolioCompany[] {
    const portfolio: PortfolioCompany[] = [];
    let companyId = 1;
    
    inputs.stageStrategies.forEach(strategy => {
      const companiesInStage = Math.round(strategy.targetCompanies);
      
      for (let i = 0; i < companiesInStage; i++) {
        portfolio.push({
          id: `company-${companyId++}`,
          name: `${strategy.stage} Company ${i + 1}`,
          currentStage: strategy.stage,
          investments: [{
            round: strategy.stage,
            amount: strategy.checkSize,
            date: new Date(),
            ownership: strategy.targetOwnership,
            valuation: strategy.entryValuation
          }],
          currentValuation: strategy.entryValuation * (1 + strategy.targetOwnership),
          status: 'active',
          metrics: {
            revenue: 0,
            growth: 0,
            runway: 18
          }
        });
      }
    });
    
    return portfolio;
  }
  
  /**
   * Calculate timeline metrics
   */
  calculateTimeline(
    portfolio: PortfolioCompany[], 
    inputs: EnhancedFundInputs
  ): TimelineMetrics[] {
    const timeline: TimelineMetrics[] = [];
    const totalQuarters = inputs.fundLifeYears * 4;
    const investmentQuarters = inputs.investmentPeriodYears * 4;
    
    let cumulativeInvested = 0;
    let cumulativeDistributed = 0;
    let cumulativeFees = 0;
    let cumulativeCarry = 0;
    
    for (let quarter = 0; quarter < totalQuarters; quarter++) {
      // Calculate deployments for this quarter
      const deployment = this.calculateQuarterlyDeployment(
        quarter, 
        investmentQuarters, 
        inputs.fundSize * 1000000,
        portfolio
      );
      
      cumulativeInvested += deployment;
      
      // Calculate distributions (simplified)
      const distributions = this.calculateQuarterlyDistributions(
        quarter,
        portfolio,
        inputs
      );
      
      cumulativeDistributed += distributions;
      
      // Calculate fees
      const fees = this.calculateQuarterlyFees(
        cumulativeInvested,
        inputs.managementFeeRate,
        quarter,
        investmentQuarters
      );
      
      cumulativeFees += fees;
      
      // Calculate NAV and metrics
      const nav = this.calculateNAV(portfolio, quarter);
      const capitalCalled = cumulativeInvested + cumulativeFees;
      
      timeline.push({
        quarter,
        quarterLabel: `Q${(quarter % 4) + 1} ${Math.floor(quarter / 4) + inputs.vintage}`,
        capitalDeployed: deployment,
        capitalCalled: deployment + fees,
        distributions,
        netCashFlow: distributions - (deployment + fees),
        cumulativeCashFlow: cumulativeDistributed - capitalCalled,
        totalInvested: cumulativeInvested,
        totalDistributed: cumulativeDistributed,
        portfolioValue: nav,
        nav,
        dpi: capitalCalled > 0 ? cumulativeDistributed / capitalCalled : 0,
        rvpi: capitalCalled > 0 ? nav / capitalCalled : 0,
        tvpi: capitalCalled > 0 ? (cumulativeDistributed + nav) / capitalCalled : 0,
        grossMOIC: cumulativeInvested > 0 ? (cumulativeDistributed + nav) / cumulativeInvested : 0,
        netMOIC: capitalCalled > 0 ? (cumulativeDistributed + nav - cumulativeCarry) / capitalCalled : 0,
        grossIRR: 0, // Calculated separately
        netIRR: 0, // Calculated separately
        managementFees: fees,
        carriedInterest: 0 // Calculated in waterfall
      });
    }
    
    // Calculate IRRs
    this.calculateIRRs(timeline);
    
    return timeline;
  }
  
  /**
   * Calculate waterfall distributions
   */
  calculateWaterfall(
    totalDistributions: number,
    totalInvested: number,
    inputs: EnhancedFundInputs
  ): WaterfallSummary {
    const totalCapitalCalled = totalInvested / (1 - inputs.gpCommitment);
    const lpCapitalCalled = totalCapitalCalled * (1 - inputs.gpCommitment);
    
    let remainingDistributions = totalDistributions;
    let lpDistributions = 0;
    let gpDistributions = 0;
    let carriedInterest = 0;
    
    // Return of capital
    const capitalReturn = Math.min(remainingDistributions, lpCapitalCalled);
    lpDistributions += capitalReturn;
    remainingDistributions -= capitalReturn;
    
    // Preferred return
    const preferredReturn = lpCapitalCalled * inputs.hurdleRate * (inputs.fundLifeYears * 0.7); // Simplified
    const prefReturn = Math.min(remainingDistributions, preferredReturn);
    lpDistributions += prefReturn;
    remainingDistributions -= prefReturn;
    
    // Carried interest on remaining
    if (remainingDistributions > 0) {
      carriedInterest = remainingDistributions * inputs.carryRate;
      gpDistributions += carriedInterest;
      lpDistributions += remainingDistributions - carriedInterest;
    }
    
    return {
      totalDistributions,
      lpDistributions,
      gpDistributions,
      preferredReturn: prefReturn,
      carryPaid: carriedInterest,
      catchUpPaid: 0, // Simplified
      lpShare: totalDistributions > 0 ? lpDistributions / totalDistributions : 0,
      gpShare: totalDistributions > 0 ? gpDistributions / totalDistributions : 0,
      effectiveCarry: totalDistributions > totalCapitalCalled ? 
        carriedInterest / (totalDistributions - totalCapitalCalled) : 0
    };
  }
  
  // Helper methods
  
  private validateInputs(inputs: EnhancedFundInputs): void {
    if (inputs.fundSize <= 0) {
      throw new Error('Fund size must be greater than 0');
    }
    
    if (inputs.managementFeeRate < 0 || inputs.managementFeeRate > 0.1) {
      throw new Error('Management fee rate must be between 0% and 10%');
    }
    
    if (inputs.carryRate < 0 || inputs.carryRate > 0.5) {
      throw new Error('Carry rate must be between 0% and 50%');
    }
    
    const totalAllocation = inputs.stageStrategies.reduce(
      (sum, s) => sum + s.allocationPercent, 0
    );
    
    if (Math.abs(totalAllocation - 1) > 0.001) {
      throw new Error('Stage allocations must sum to 100%');
    }
  }
  
  private postProcessForecast(
    forecast: ForecastResult, 
    inputs: EnhancedFundInputs
  ): ForecastResult {
    // Add any post-processing logic
    return {
      ...forecast,
      fundMetrics: {
        capitalCalled: forecast.totalInvested * 1.1, // Including fees
        capitalDistributed: forecast.totalDistributed,
        capitalRemaining: (inputs.fundSize * 1000000) - forecast.totalInvested,
        dryPowder: (inputs.fundSize * 1000000) - forecast.totalInvested,
        totalValue: forecast.totalDistributed + forecast.portfolioValue,
        netAssetValue: forecast.portfolioValue,
        totalManagementFees: forecast.managementFees,
        totalCarriedInterest: forecast.carriedInterest,
        lpNetProceeds: forecast.totalDistributed - forecast.carriedInterest,
        gpTotalCompensation: forecast.managementFees + forecast.carriedInterest
      }
    };
  }
  
  private calculateQuarterlyDeployment(
    quarter: number,
    investmentQuarters: number,
    totalCapital: number,
    portfolio: PortfolioCompany[]
  ): number {
    if (quarter >= investmentQuarters) return 0;
    
    // Simple linear deployment
    const baseDeployment = totalCapital * 0.6 / investmentQuarters;
    
    // Add some variance
    const variance = Math.sin(quarter * 0.5) * 0.2;
    return baseDeployment * (1 + variance);
  }
  
  private calculateQuarterlyDistributions(
    quarter: number,
    portfolio: PortfolioCompany[],
    inputs: EnhancedFundInputs
  ): number {
    // Simplified distribution calculation
    if (quarter < 12) return 0; // No distributions in first 3 years
    
    const exitRate = 0.05; // 5% of portfolio exits per quarter after year 3
    const avgMultiple = 3.0;
    const avgInvestment = inputs.fundSize * 1000000 / portfolio.length;
    
    return avgInvestment * avgMultiple * exitRate * portfolio.length;
  }
  
  private calculateQuarterlyFees(
    investedCapital: number,
    feeRate: number,
    quarter: number,
    investmentQuarters: number
  ): number {
    // Management fees on committed capital during investment period
    if (quarter < investmentQuarters) {
      return feeRate / 4; // Quarterly fee
    }
    // Fees on invested capital after investment period
    return investedCapital * feeRate / 4;
  }
  
  private calculateNAV(portfolio: PortfolioCompany[], quarter: number): number {
    return portfolio.reduce((sum, company) => {
      if (company.status === 'active') {
        // Simple appreciation model
        const quartersSinceInvestment = quarter;
        const appreciation = Math.pow(1.15, quartersSinceInvestment / 4); // 15% annual
        return sum + company.currentValuation * appreciation;
      }
      return sum;
    }, 0);
  }
  
  private calculateIRRs(timeline: TimelineMetrics[]): void {
    // Simplified IRR calculation - in production use XIRR
    const totalIn = timeline[timeline.length - 1].totalInvested;
    const totalOut = timeline[timeline.length - 1].totalDistributed + 
                     timeline[timeline.length - 1].portfolioValue;
    const years = timeline.length / 4;
    
    const grossMOIC = totalOut / totalIn;
    const grossIRR = Math.pow(grossMOIC, 1 / years) - 1;
    
    // Apply to all timeline entries
    timeline.forEach(t => {
      t.grossIRR = grossIRR;
      t.netIRR = grossIRR * 0.8; // Simplified net IRR
    });
  }
}

// Export singleton instance
export const fundForecastService = FundForecastService.getInstance();