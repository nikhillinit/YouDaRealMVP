import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { EnhancedFundInputs, ForecastResult, ScenarioDefinition, ScenarioResult } from '../shared/enhanced-types';
import { SecureStorage } from '../utils/SecureStorage';
import { Money } from '../utils/MoneyTypes';

/**
 * App state interface
 */
interface AppState {
  // Fund configuration
  fundInputs: EnhancedFundInputs | null;
  
  // Forecast results
  currentForecast: ForecastResult | null;
  isCalculating: boolean;
  
  // Scenarios
  scenarios: ScenarioDefinition[];
  scenarioResults: ScenarioResult[];
  
  // Portfolio tracking
  actualInvestments: any[]; // TODO: Define proper type
  
  // UI state
  selectedScenarioId: string | null;
  isDirty: boolean; // Unsaved changes
  lastSaved: Date | null;
}

/**
 * Action types
 */
type AppAction =
  | { type: 'SET_FUND_INPUTS'; payload: EnhancedFundInputs }
  | { type: 'SET_FORECAST_RESULT'; payload: ForecastResult }
  | { type: 'SET_CALCULATING'; payload: boolean }
  | { type: 'ADD_SCENARIO'; payload: ScenarioDefinition }
  | { type: 'UPDATE_SCENARIO'; payload: { id: string; updates: Partial<ScenarioDefinition> } }
  | { type: 'DELETE_SCENARIO'; payload: string }
  | { type: 'SET_SCENARIO_RESULTS'; payload: ScenarioResult[] }
  | { type: 'SELECT_SCENARIO'; payload: string | null }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: Date }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> };

/**
 * Initial state
 */
const initialState: AppState = {
  fundInputs: null,
  currentForecast: null,
  isCalculating: false,
  scenarios: [],
  scenarioResults: [],
  actualInvestments: [],
  selectedScenarioId: null,
  isDirty: false,
  lastSaved: null,
};

/**
 * Reducer
 */
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_FUND_INPUTS':
      return { 
        ...state, 
        fundInputs: action.payload, 
        isDirty: true 
      };
      
    case 'SET_FORECAST_RESULT':
      return { 
        ...state, 
        currentForecast: action.payload,
        isCalculating: false 
      };
      
    case 'SET_CALCULATING':
      return { 
        ...state, 
        isCalculating: action.payload 
      };
      
    case 'ADD_SCENARIO':
      return { 
        ...state, 
        scenarios: [...state.scenarios, action.payload],
        isDirty: true 
      };
      
    case 'UPDATE_SCENARIO':
      return {
        ...state,
        scenarios: state.scenarios.map(s =>
          s.id === action.payload.id
            ? { ...s, ...action.payload.updates }
            : s
        ),
        isDirty: true
      };
      
    case 'DELETE_SCENARIO':
      return {
        ...state,
        scenarios: state.scenarios.filter(s => s.id !== action.payload),
        scenarioResults: state.scenarioResults.filter(r => r.scenarioId !== action.payload),
        selectedScenarioId: state.selectedScenarioId === action.payload ? null : state.selectedScenarioId,
        isDirty: true
      };
      
    case 'SET_SCENARIO_RESULTS':
      return { 
        ...state, 
        scenarioResults: action.payload 
      };
      
    case 'SELECT_SCENARIO':
      return { 
        ...state, 
        selectedScenarioId: action.payload 
      };
      
    case 'SET_DIRTY':
      return { 
        ...state, 
        isDirty: action.payload 
      };
      
    case 'SET_LAST_SAVED':
      return { 
        ...state, 
        lastSaved: action.payload,
        isDirty: false 
      };
      
    case 'LOAD_STATE':
      return { 
        ...state, 
        ...action.payload 
      };
      
    default:
      return state;
  }
}

/**
 * Context
 */
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Helper methods
  saveFund: () => Promise<void>;
  loadFund: () => Promise<void>;
  calculateForecast: () => Promise<void>;
  runScenarios: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Storage instance
 */
const storage = new SecureStorage('povc_fund_model', '1.0.0');

/**
 * Provider component
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Save fund to secure storage
  const saveFund = async () => {
    if (!state.fundInputs) return;
    
    try {
      await storage.save('fund_inputs', state.fundInputs, {
        encrypted: true,
        compress: true,
      });
      
      await storage.save('scenarios', state.scenarios, {
        encrypted: true,
        compress: true,
      });
      
      dispatch({ type: 'SET_LAST_SAVED', payload: new Date() });
    } catch (error) {
      console.error('Failed to save fund:', error);
      throw error;
    }
  };

  // Load fund from secure storage
  const loadFund = async () => {
    try {
      const fundInputs = await storage.get<EnhancedFundInputs>('fund_inputs', {
        encrypted: true,
        compress: true,
      });
      
      const scenarios = await storage.get<ScenarioDefinition[]>('scenarios', {
        encrypted: true,
        compress: true,
      });
      
      if (fundInputs) {
        dispatch({ 
          type: 'LOAD_STATE', 
          payload: {
            fundInputs,
            scenarios: scenarios || [],
            isDirty: false,
            lastSaved: new Date(), // TODO: Store actual last saved date
          }
        });
      }
    } catch (error) {
      console.error('Failed to load fund:', error);
      throw error;
    }
  };

  // Calculate forecast
  const calculateForecast = async () => {
    if (!state.fundInputs) return;
    
    dispatch({ type: 'SET_CALCULATING', payload: true });
    
    try {
      // Import dynamically to enable code splitting
      const { EnhancedCohortEngine } = await import('../core/EnhancedCohortEngine');
      
      const engine = new EnhancedCohortEngine(state.fundInputs);
      const forecast = await engine.generateForecast();
      
      dispatch({ type: 'SET_FORECAST_RESULT', payload: forecast });
    } catch (error) {
      console.error('Forecast calculation failed:', error);
      dispatch({ type: 'SET_CALCULATING', payload: false });
      throw error;
    }
  };

  // Run scenario analysis
  const runScenarios = async () => {
    if (!state.fundInputs || state.scenarios.length === 0) return;
    
    dispatch({ type: 'SET_CALCULATING', payload: true });
    
    try {
      const { ScenarioRunner } = await import('../core/ScenarioRunner');
      
      const runner = new ScenarioRunner(state.fundInputs);
      const results = await runner.runScenarios(state.scenarios);
      
      dispatch({ type: 'SET_SCENARIO_RESULTS', payload: results });
      dispatch({ type: 'SET_CALCULATING', payload: false });
    } catch (error) {
      console.error('Scenario analysis failed:', error);
      dispatch({ type: 'SET_CALCULATING', payload: false });
      throw error;
    }
  };

  // Load saved state on mount
  React.useEffect(() => {
    loadFund().catch(console.error);
  }, []);

  // Auto-save when dirty (with debounce)
  React.useEffect(() => {
    if (state.isDirty && state.fundInputs) {
      const timer = setTimeout(() => {
        saveFund().catch(console.error);
      }, 5000); // 5 second debounce
      
      return () => clearTimeout(timer);
    }
  }, [state.isDirty, state.fundInputs]);

  const value: AppContextValue = {
    state,
    dispatch,
    saveFund,
    loadFund,
    calculateForecast,
    runScenarios,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook to use app context
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
