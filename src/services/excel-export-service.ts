// src/services/excel-export-service.ts

import * as XLSX from 'xlsx';
import { 
  ForecastResult, 
  EnhancedFundInputs,
  PortfolioCompany,
  TimelineMetrics,
  ReserveAllocation,
  PacingAnalysis
} from '../shared/enhanced-types';
import { formatCurrency, formatPercent, formatNumber, formatDate } from '../utils/formatters';

export interface ExcelExportOptions {
  includeSummary?: boolean;
  includeCashFlows?: boolean;
  includePortfolio?: boolean;
  includeReserves?: boolean;
  includePacing?: boolean;
  includeAssumptions?: boolean;
  includeWaterfall?: boolean;
  lpFriendly?: boolean;
  dateFormat?: 'short' | 'long' | 'iso';
}

export class ExcelExportService {
  private static instance: ExcelExportService;
  
  private constructor() {}
  
  static getInstance(): ExcelExportService {
    if (!ExcelExportService.instance) {
      ExcelExportService.instance = new ExcelExportService();
    }
    return ExcelExportService.instance;
  }
  
  /**
   * Export complete fund model to Excel
   */
  async exportFundModel(
    forecastResult: ForecastResult,
    fundInputs: EnhancedFundInputs,
    additionalData?: {
      reserveAnalysis?: ReserveAllocation[];
      pacingAnalysis?: PacingAnalysis;
    },
    options: ExcelExportOptions = {}
  ): Promise<Blob> {
    const {
      includeSummary = true,
      includeCashFlows = true,
      includePortfolio = true,
      includeReserves = true,
      includePacing = true,
      includeAssumptions = true,
      includeWaterfall = true,
      lpFriendly = false
    } = options;
    
    const workbook = XLSX.utils.book_new();
    
    // Add sheets based on options
    if (includeSummary) {
      this.addSummarySheet(workbook, forecastResult, fundInputs);
    }
    
    if (includeCashFlows) {
      this.addCashFlowSheet(workbook, forecastResult.timeline);
    }
    
    if (includePortfolio && !lpFriendly) {
      this.addPortfolioSheet(workbook, forecastResult.portfolio);
    }
    
    if (includeReserves && additionalData?.reserveAnalysis) {
      this.addReserveAnalysisSheet(workbook, additionalData.reserveAnalysis);
    }
    
    if (includePacing && additionalData?.pacingAnalysis) {
      this.addPacingAnalysisSheet(workbook, additionalData.pacingAnalysis);
    }
    
    if (includeAssumptions) {
      this.addAssumptionsSheet(workbook, fundInputs);
    }
    
    if (includeWaterfall) {
      this.addWaterfallSheet(workbook, forecastResult);
    }
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      bookSST: true,
      compression: true
    });
    
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }
  
  /**
   * Export LP-friendly report
   */
  async exportLPReport(
    forecastResult: ForecastResult,
    fundInputs: EnhancedFundInputs
  ): Promise<Blob> {
    return this.exportFundModel(
      forecastResult,
      fundInputs,
      undefined,
      {
        includeSummary: true,
        includeCashFlows: true,
        includePortfolio: false, // Hide individual companies
        includeReserves: false,  // Hide detailed reserves
        includePacing: true,
        includeAssumptions: true,
        includeWaterfall: true,
        lpFriendly: true
      }
    );
  }
  
  // Sheet creation methods
  
  private addSummarySheet(
    workbook: XLSX.WorkBook,
    result: ForecastResult,
    inputs: EnhancedFundInputs
  ): void {
    const summaryData = [
      ['Fund Performance Summary'],
      [],
      ['Fund Information'],
      ['Fund Name:', inputs.fundName || 'VC Fund'],
      ['Fund Size:', formatCurrency(inputs.fundSize * 1000000)],
      ['Vintage:', inputs.vintage || new Date().getFullYear()],
      [],
      ['Key Performance Metrics'],
      ['', 'Gross', 'Net'],
      ['MOIC:', formatNumber(result.moic.gross, 2) + 'x', formatNumber(result.moic.net, 2) + 'x'],
      ['IRR:', formatPercent(result.irr.gross), formatPercent(result.irr.net)],
      [],
      ['Fund Metrics'],
      ['DPI:', formatNumber(result.dpi, 3) + 'x'],
      ['RVPI:', formatNumber(result.rvpi, 3) + 'x'],
      ['TVPI:', formatNumber(result.tvpi, 3) + 'x'],
      [],
      ['Capital Summary'],
      ['Total Invested:', formatCurrency(result.totalInvested)],
      ['Total Distributed:', formatCurrency(result.totalDistributed)],
      ['Portfolio Value:', formatCurrency(result.portfolioValue)],
      ['Management Fees:', formatCurrency(result.managementFees)],
      ['Carried Interest:', formatCurrency(result.carriedInterest)],
      [],
      ['Portfolio Overview'],
      ['Total Companies:', result.portfolio.length],
      ['Active Companies:', result.portfolio.filter(c => c.status === 'active').length],
      ['Exited Companies:', result.portfolio.filter(c => c.status === 'exited').length],
      ['Written Off:', result.portfolio.filter(c => c.status === 'written-off').length],
      [],
      ['Generated:', new Date().toLocaleString()]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Styling
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
    ws['!rows'] = [{ hpt: 24 }]; // Title row height
    
    XLSX.utils.book_append_sheet(workbook, ws, 'Summary');
  }
  
  private addCashFlowSheet(
    workbook: XLSX.WorkBook,
    timeline: TimelineMetrics[]
  ): void {
    const cashFlowData = timeline.map(period => ({
      'Quarter': period.quarterLabel,
      'Capital Called': period.capitalCalled,
      'Capital Deployed': period.capitalDeployed,
      'Distributions': period.distributions,
      'Net Cash Flow': period.netCashFlow,
      'Cumulative Cash Flow': period.cumulativeCashFlow,
      'NAV': period.nav,
      'DPI': period.dpi,
      'RVPI': period.rvpi,
      'TVPI': period.tvpi,
      'Gross MOIC': period.grossMOIC,
      'Management Fees': period.managementFees,
      'Carried Interest': period.carriedInterest
    }));
    
    const ws = XLSX.utils.json_to_sheet(cashFlowData);
    
    // Format numeric columns
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = 1; C <= 12; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cell_address]) {
          ws[cell_address].z = C >= 7 && C <= 10 ? '0.000' : '$#,##0';
        }
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, ws, 'Cash Flows');
  }
  
  private addPortfolioSheet(
    workbook: XLSX.WorkBook,
    portfolio: PortfolioCompany[]
  ): void {
    const portfolioData = portfolio.map(company => {
      const totalInvested = company.investments.reduce((sum, inv) => sum + inv.amount, 0);
      const currentValue = company.exitValue || company.currentValuation;
      
      return {
        'Company Name': company.name,
        'Current Stage': company.currentStage,
        'Status': company.status,
        'Initial Investment': company.investments[0]?.amount || 0,
        'Total Invested': totalInvested,
        'Number of Rounds': company.investments.length,
        'Current Valuation': company.currentValuation,
        'Exit Value': company.exitValue || '',
        'Exit Date': company.exitDate ? formatDate(company.exitDate) : '',
        'Multiple': totalInvested > 0 ? currentValue / totalInvested : 0,
        'IRR': '' // Would need to calculate
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(portfolioData);
    
    // Format numeric columns
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      // Format currency columns
      for (const C of [3, 4, 6, 7]) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cell_address] && ws[cell_address].v) {
          ws[cell_address].z = '$#,##0';
        }
      }
      // Format multiple column
      const multipleCell = XLSX.utils.encode_cell({ r: R, c: 9 });
      if (ws[multipleCell] && ws[multipleCell].v) {
        ws[multipleCell].z = '0.00"x"';
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, ws, 'Portfolio');
  }
  
  private addReserveAnalysisSheet(
    workbook: XLSX.WorkBook,
    reserveAnalysis: ReserveAllocation[]
  ): void {
    const reserveData = reserveAnalysis.map(allocation => ({
      'Company': allocation.companyName,
      'Current Stage': allocation.currentStage,
      'Recommended Reserve': allocation.recommendedReserve,
      'Exit MOIC on Reserves': allocation.exitMOICOnReserves,
      'Probability Adjusted Return': allocation.probabilityAdjustedReturn,
      'Allocation Rationale': allocation.allocationRationale
    }));
    
    const ws = XLSX.utils.json_to_sheet(reserveData);
    
    // Format numeric columns
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      // Currency column
      const currencyCell = XLSX.utils.encode_cell({ r: R, c: 2 });
      if (ws[currencyCell]) {
        ws[currencyCell].z = '$#,##0';
      }
      // MOIC columns
      for (const C of [3, 4]) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cell]) {
          ws[cell].z = '0.00"x"';
        }
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, ws, 'Reserve Analysis');
  }
  
  private addPacingAnalysisSheet(
    workbook: XLSX.WorkBook,
    pacingAnalysis: PacingAnalysis
  ): void {
    const pacingData = [
      ['Pacing Analysis'],
      [],
      ['Overall Metrics'],
      ['Total Invested:', formatCurrency(pacingAnalysis.totalInvested)],
      ['Average Quarterly Deployment:', formatCurrency(pacingAnalysis.avgQuarterlyDeployment)],
      ['Pacing Score:', formatNumber(pacingAnalysis.pacingScore, 0) + '/100'],
      ['Deployment Variance:', formatCurrency(pacingAnalysis.deploymentVariance)],
      ['Front-Loading Ratio:', formatPercent(pacingAnalysis.frontLoadingRatio)],
      ['Deployment Efficiency:', formatPercent(pacingAnalysis.deploymentEfficiency)],
      [],
      ['Quarterly Deployment']
    ];
    
    // Add quarterly deployment data
    pacingAnalysis.quarterlyDeployments.forEach((deployment, index) => {
      pacingData.push([`Q${index + 1}`, deployment]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(pacingData);
    
    // Format currency cells
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = 11; R <= range.e.r; ++R) {
      const cell = XLSX.utils.encode_cell({ r: R, c: 1 });
      if (ws[cell]) {
        ws[cell].z = '$#,##0';
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, ws, 'Pacing Analysis');
  }
  
  private addAssumptionsSheet(
    workbook: XLSX.WorkBook,
    inputs: EnhancedFundInputs
  ): void {
    const assumptionsData = [
      ['Fund Model Assumptions'],
      [],
      ['Fund Parameters'],
      ['Fund Name:', inputs.fundName],
      ['Fund Size (millions):', inputs.fundSize],
      ['Currency:', inputs.currency || 'USD'],
      ['Vintage:', inputs.vintage || new Date().getFullYear()],
      [],
      ['Fee Structure'],
      ['Management Fee Rate:', formatPercent(inputs.managementFeeRate)],
      ['Carry Rate:', formatPercent(inputs.carryRate)],
      ['GP Commitment:', formatPercent(inputs.gpCommitment)],
      ['Hurdle Rate:', formatPercent(inputs.hurdleRate)],
      [],
      ['Timeline'],
      ['Investment Period (years):', inputs.investmentPeriodYears],
      ['Fund Life (years):', inputs.fundLifeYears],
      [],
      ['Stage Allocation Strategy'],
      ['Stage', 'Allocation %', 'Check Size', 'Target Companies', 'Follow-On %', 'Target Ownership', 'Entry Valuation']
    ];
    
    // Add stage strategies
    inputs.stageStrategies.forEach(strategy => {
      assumptionsData.push([
        strategy.stage,
        formatPercent(strategy.allocationPercent),
        formatCurrency(strategy.checkSize),
        strategy.targetCompanies,
        formatPercent(strategy.followOnPercent),
        formatPercent(strategy.targetOwnership),
        formatCurrency(strategy.entryValuation)
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(assumptionsData);
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
      { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, ws, 'Assumptions');
  }
  
  private addWaterfallSheet(
    workbook: XLSX.WorkBook,
    result: ForecastResult
  ): void {
    const waterfall = result.waterfall;
    
    const waterfallData = [
      ['Distribution Waterfall Analysis'],
      [],
      ['Summary'],
      ['Total Distributions:', formatCurrency(waterfall.totalDistributions)],
      [],
      ['LP Analysis'],
      ['LP Distributions:', formatCurrency(waterfall.lpDistributions)],
      ['LP Share:', formatPercent(waterfall.lpShare)],
      [],
      ['GP Analysis'],
      ['GP Distributions:', formatCurrency(waterfall.gpDistributions)],
      ['GP Share:', formatPercent(waterfall.gpShare)],
      [],
      ['Waterfall Components'],
      ['Preferred Return:', formatCurrency(waterfall.preferredReturn)],
      ['Carried Interest:', formatCurrency(waterfall.carryPaid)],
      ['Catch-Up:', formatCurrency(waterfall.catchUpPaid)],
      [],
      ['Effective Carry Rate:', formatPercent(waterfall.effectiveCarry)]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(waterfallData);
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }];
    
    XLSX.utils.book_append_sheet(workbook, ws, 'Waterfall');
  }
}

// Export singleton instance
export const excelExportService = ExcelExportService.getInstance();
