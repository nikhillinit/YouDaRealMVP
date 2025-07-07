import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { MoneyInput } from '../components/inputs/MoneyInput';
import { PercentInput, AllocationInput } from '../components/inputs/PercentInput';
import { Money, Percent } from '../utils/MoneyTypes';
import { EnhancedFundInputs, StageStrategy, FundStage } from '../shared/enhanced-types';
import { Save, AlertCircle, ChevronRight, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FundSetupProps {
  navigate: (path: string) => void;
}

const FUND_STAGES: FundStage[] = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+'];

export default function FundSetup({ navigate }: FundSetupProps) {
  const { state, dispatch, saveFund } = useApp();
  const [activeTab, setActiveTab] = useState<'basic' | 'strategy' | 'fees' | 'modeling'>('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form state from existing fund inputs or defaults
  const [formData, setFormData] = useState<EnhancedFundInputs>(() => {
    if (state.fundInputs) {
      return state.fundInputs;
    }
    
    // Default values for new fund
    return {
      fundName: '',
      fundSize: 50, // $50M default
      vintage: new Date().getFullYear(),
      investmentPeriod: 5,
      fundLife: 10,
      managementFeeRate: 2.0,
      carryRate: 20.0,
      hurdleRate: 8.0,
      catchUp: true,
      catchUpRate: 100.0,
      gpCommitment: 2.0,
      stageStrategies: FUND_STAGES.map(stage => ({
        stage,
        allocationPercent: 100 / FUND_STAGES.length / 100, // Equal allocation
        checkSize: { min: 0.5, target: 1.0, max: 2.0 },
        ownershipTarget: 10.0,
        reserveRatio: 1.0,
        graduationRate: 0.7,
        exitProbabilities: {
          fail: 0.4,
          '1x-3x': 0.3,
          '3x-5x': 0.15,
          '5x-10x': 0.1,
          '10x+': 0.05,
        },
      })),
      reserveStrategy: {
        totalReserveRatio: 1.0,
        allocationMethod: 'pro-rata',
        deploymentTiming: 'as-needed',
      },
      modelingAssumptions: {
        quarterlyDeploymentRate: 0.05,
        followOnParticipation: 0.8,
        exitTimeline: {
          minimum: 3,
          median: 5,
          maximum: 8,
        },
        valuationGrowth: {
          'Pre-Seed': { toSeed: 2.5 },
          'Seed': { toA: 3.0 },
          'Series A': { toB: 2.5 },
          'Series B': { toC: 2.0 },
          'Series C': { toD: 1.8 },
        },
      },
    };
  });

  // Form validation
  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.fundName.trim()) {
      errors.push('Fund name is required');
    }

    if (formData.fundSize <= 0) {
      errors.push('Fund size must be greater than 0');
    }

    // Validate stage allocations sum to 100%
    const totalAllocation = formData.stageStrategies.reduce(
      (sum, s) => sum + s.allocationPercent,
      0
    );
    if (Math.abs(totalAllocation - 1.0) > 0.001) {
      errors.push('Stage allocations must sum to 100%');
    }

    // Validate exit probabilities for each stage
    formData.stageStrategies.forEach(strategy => {
      const totalProb = Object.values(strategy.exitProbabilities).reduce((sum, p) => sum + p, 0);
      if (Math.abs(totalProb - 1.0) > 0.001) {
        errors.push(`Exit probabilities for ${strategy.stage} must sum to 100%`);
      }
    });

    return errors;
  };

  // Save fund configuration
  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setIsSaving(true);
    try {
      dispatch({ type: 'SET_FUND_INPUTS', payload: formData });
      await saveFund();
      toast.success('Fund configuration saved');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to save fund configuration');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Update form data helpers
  const updateBasic = (updates: Partial<EnhancedFundInputs>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateStageStrategy = (index: number, updates: Partial<StageStrategy>) => {
    setFormData(prev => ({
      ...prev,
      stageStrategies: prev.stageStrategies.map((s, i) =>
        i === index ? { ...s, ...updates } : s
      ),
    }));
  };

  // Tab navigation
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'strategy', label: 'Investment Strategy', icon: '🎯' },
    { id: 'fees', label: 'Fees & Carry', icon: '💰' },
    { id: 'modeling', label: 'Modeling Assumptions', icon: '📊' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Fund Setup</h1>
        <p className="text-gray-600 mt-1">Configure your fund parameters and investment strategy</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center px-6 py-3 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fund Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fundName}
                  onChange={(e) => updateBasic({ fundName: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Acme Ventures Fund I"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <MoneyInput
                  label="Fund Size"
                  value={Money.fromDollars(formData.fundSize * 1000000)}
                  onChange={(value) => updateBasic({ fundSize: value ? value.toDollars() / 1000000 : 0 })}
                  required
                  min={Money.fromDollars(1000000)} // $1M minimum
                  compact
                  helpText="Total fund size in millions"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vintage Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.vintage}
                    onChange={(e) => updateBasic({ vintage: parseInt(e.target.value) })}
                    min={2020}
                    max={2030}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investment Period (years)
                  </label>
                  <input
                    type="number"
                    value={formData.investmentPeriod}
                    onChange={(e) => updateBasic({ investmentPeriod: parseInt(e.target.value) })}
                    min={3}
                    max={7}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fund Life (years)
                  </label>
                  <input
                    type="number"
                    value={formData.fundLife}
                    onChange={(e) => updateBasic({ fundLife: parseInt(e.target.value) })}
                    min={7}
                    max={15}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Investment Strategy Tab */}
          {activeTab === 'strategy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Stage Allocation</h3>
                <AllocationInput
                  allocations={formData.stageStrategies.map(s => 
                    Percent.fromDecimal(s.allocationPercent)
                  )}
                  onChange={(allocations) => {
                    allocations.forEach((pct, i) => {
                      updateStageStrategy(i, { allocationPercent: pct.toDecimal() });
                    });
                  }}
                  labels={FUND_STAGES}
                />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Check Sizes by Stage</h3>
                <div className="space-y-4">
                  {formData.stageStrategies.map((strategy, index) => (
                    <div key={strategy.stage} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">{strategy.stage}</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <MoneyInput
                          label="Min Check"
                          value={Money.fromDollars(strategy.checkSize.min * 1000000)}
                          onChange={(value) => updateStageStrategy(index, {
                            checkSize: { ...strategy.checkSize, min: value ? value.toDollars() / 1000000 : 0 }
                          })}
                          compact
                        />
                        <MoneyInput
                          label="Target Check"
                          value={Money.fromDollars(strategy.checkSize.target * 1000000)}
                          onChange={(value) => updateStageStrategy(index, {
                            checkSize: { ...strategy.checkSize, target: value ? value.toDollars() / 1000000 : 0 }
                          })}
                          compact
                        />
                        <MoneyInput
                          label="Max Check"
                          value={Money.fromDollars(strategy.checkSize.max * 1000000)}
                          onChange={(value) => updateStageStrategy(index, {
                            checkSize: { ...strategy.checkSize, max: value ? value.toDollars() / 1000000 : 0 }
                          })}
                          compact
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <PercentInput
                          label="Target Ownership"
                          value={Percent.fromPercentage(strategy.ownershipTarget)}
                          onChange={(value) => updateStageStrategy(index, {
                            ownershipTarget: value ? value.toPercentage() : 0
                          })}
                          showSlider
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reserve Ratio
                          </label>
                          <input
                            type="number"
                            value={strategy.reserveRatio}
                            onChange={(e) => updateStageStrategy(index, {
                              reserveRatio: parseFloat(e.target.value)
                            })}
                            min={0}
                            max={3}
                            step={0.1}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fees & Carry Tab */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <PercentInput
                  label="Management Fee"
                  value={Percent.fromPercentage(formData.managementFeeRate)}
                  onChange={(value) => updateBasic({ 
                    managementFeeRate: value ? value.toPercentage() : 0 
                  })}
                  min={0}
                  max={5}
                  showSlider
                  helpText="Annual management fee rate"
                />
                
                <PercentInput
                  label="Carried Interest"
                  value={Percent.fromPercentage(formData.carryRate)}
                  onChange={(value) => updateBasic({ 
                    carryRate: value ? value.toPercentage() : 0 
                  })}
                  min={0}
                  max={30}
                  showSlider
                  helpText="GP carry percentage"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <PercentInput
                  label="Hurdle Rate"
                  value={Percent.fromPercentage(formData.hurdleRate)}
                  onChange={(value) => updateBasic({ 
                    hurdleRate: value ? value.toPercentage() : 0 
                  })}
                  min={0}
                  max={20}
                  showSlider
                  helpText="Preferred return hurdle"
                />
                
                <PercentInput
                  label="GP Commitment"
                  value={Percent.fromPercentage(formData.gpCommitment)}
                  onChange={(value) => updateBasic({ 
                    gpCommitment: value ? value.toPercentage() : 0 
                  })}
                  min={0}
                  max={10}
                  showSlider
                  helpText="GP capital commitment"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">American Waterfall Structure</p>
                    <p className="mt-1">
                      This model uses an American waterfall with full catch-up. 
                      LPs receive 100% of distributions until they achieve their preferred return, 
                      then GP receives 100% until caught up, then 80/20 split thereafter.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modeling Assumptions Tab */}
          {activeTab === 'modeling' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Exit Probabilities</h3>
                <div className="space-y-4">
                  {formData.stageStrategies.map((strategy, index) => (
                    <div key={strategy.stage} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">{strategy.stage}</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(strategy.exitProbabilities).map(([outcome, prob]) => (
                          <div key={outcome}>
                            <label className="block text-xs text-gray-600 mb-1">{outcome}</label>
                            <PercentInput
                              value={Percent.fromDecimal(prob)}
                              onChange={(value) => {
                                const newProbs = { ...strategy.exitProbabilities };
                                newProbs[outcome as keyof typeof strategy.exitProbabilities] = 
                                  value ? value.toDecimal() : 0;
                                updateStageStrategy(index, { exitProbabilities: newProbs });
                              }}
                              decimals={0}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-medium">Exit Probability Validation</p>
                    <p className="mt-1">
                      Each stage's exit probabilities must sum to 100%. 
                      The model will use these to simulate realistic exit outcomes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Fund Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
