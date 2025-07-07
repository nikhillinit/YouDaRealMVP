import React, { useState, useEffect, useRef } from 'react';
import { Percent } from '../../utils/MoneyTypes';
import { Percent as PercentIcon, AlertCircle } from 'lucide-react';

interface PercentInputProps {
  value: Percent | null;
  onChange: (value: Percent | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  min?: number; // 0-100
  max?: number; // 0-100
  error?: string;
  helpText?: string;
  disabled?: boolean;
  decimals?: number;
  className?: string;
  showSlider?: boolean; // Show visual slider
}

/**
 * Production-grade percentage input component
 * Handles 0-100 range with proper validation
 */
export function PercentInput({
  value,
  onChange,
  label,
  placeholder = '0%',
  required = false,
  min = 0,
  max = 100,
  error,
  helpText,
  disabled = false,
  decimals = 1,
  className = '',
  showSlider = false,
}: PercentInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format value for display
  useEffect(() => {
    if (!isFocused) {
      if (value) {
        setDisplayValue(value.toPercentage().toFixed(decimals));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused, decimals]);

  // Parse user input to Percent
  const parseInput = (input: string): Percent | null => {
    // Remove all non-numeric characters except decimal point
    const cleaned = input.replace(/[^0-9.]/g, '');
    
    // Handle empty input
    if (!cleaned) {
      return null;
    }

    // Parse to number
    const num = parseFloat(cleaned);
    
    // Validate number
    if (isNaN(num)) {
      return null;
    }

    // Check constraints
    if (num < min || num > max) {
      return null;
    }

    // Create Percent instance
    try {
      return Percent.fromPercentage(num);
    } catch {
      return null;
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(input);

    // Parse and validate
    const parsed = parseInput(input);
    
    if (parsed !== null) {
      onChange(parsed);
    } else if (input === '') {
      onChange(null);
    }
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    if (value) {
      setDisplayValue(value.toPercentage().toString());
    }
  };

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
    
    // Reformat on blur
    if (displayValue) {
      const parsed = parseInput(displayValue);
      if (parsed) {
        onChange(parsed);
      } else {
        onChange(null);
      }
    }
  };

  // Handle arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const current = value ? value.toPercentage() : 0;
      const newValue = Math.min(current + 1, max);
      onChange(Percent.fromPercentage(newValue));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const current = value ? value.toPercentage() : 0;
      const newValue = Math.max(current - 1, min);
      onChange(Percent.fromPercentage(newValue));
    }
  };

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value);
    onChange(Percent.fromPercentage(num));
  };

  // Validation state
  const hasError = !!error;
  const showRequired = required && !value;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            block w-full pr-9 pl-3 py-2 border rounded-md
            ${hasError 
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'}
            sm:text-sm
          `}
        />
        
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {hasError ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <PercentIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {/* Visual slider */}
      {showSlider && value && (
        <div className="mt-2">
          <input
            type="range"
            min={min}
            max={max}
            step={0.1}
            value={value.toPercentage()}
            onChange={handleSliderChange}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{min}%</span>
            <span>{value.format(decimals)}</span>
            <span>{max}%</span>
          </div>
        </div>
      )}
      
      {/* Help text or error message */}
      {(helpText || error) && (
        <p className={`mt-1 text-sm ${hasError ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helpText}
        </p>
      )}
    </div>
  );
}

/**
 * Percentage display component with visual bar
 */
export function PercentDisplay({ 
  value, 
  showBar = false,
  barColor = 'blue',
  className = '',
}: { 
  value: Percent;
  showBar?: boolean;
  barColor?: 'blue' | 'green' | 'red' | 'yellow';
  className?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div className={className}>
      {showBar ? (
        <div className="flex items-center space-x-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${colorClasses[barColor]}`}
              style={{ width: `${value.toPercentage()}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 w-12 text-right">
            {value.format()}
          </span>
        </div>
      ) : (
        <span className="font-mono text-gray-900">{value.format()}</span>
      )}
    </div>
  );
}

/**
 * Multi-percentage allocation input
 * Ensures all percentages sum to 100%
 */
export function AllocationInput({
  allocations,
  onChange,
  labels,
  error,
  className = '',
}: {
  allocations: Percent[];
  onChange: (allocations: Percent[]) => void;
  labels: string[];
  error?: string;
  className?: string;
}) {
  const total = allocations.reduce((sum, pct) => sum + pct.toPercentage(), 0);
  const isValid = Math.abs(total - 100) < 0.01;

  const handleChange = (index: number, value: Percent | null) => {
    if (!value) return;
    
    const newAllocations = [...allocations];
    newAllocations[index] = value;
    
    // Auto-adjust if close to 100%
    const newTotal = newAllocations.reduce((sum, pct) => sum + pct.toPercentage(), 0);
    if (Math.abs(newTotal - 100) < 1 && index < allocations.length - 1) {
      // Adjust the last allocation to make it exactly 100%
      const lastIndex = allocations.length - 1;
      const adjustment = 100 - newTotal + newAllocations[lastIndex].toPercentage();
      if (adjustment >= 0 && adjustment <= 100) {
        newAllocations[lastIndex] = Percent.fromPercentage(adjustment);
      }
    }
    
    onChange(newAllocations);
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        {allocations.map((allocation, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="text-sm text-gray-700 w-24">{labels[index]}</span>
            <div className="flex-1">
              <PercentInput
                value={allocation}
                onChange={(value) => handleChange(index, value)}
                showSlider
                decimals={1}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Total indicator */}
      <div className={`mt-3 p-3 rounded-md ${isValid ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Total</span>
          <span className={`text-sm font-bold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
            {total.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {(!isValid || error) && (
        <p className="mt-2 text-sm text-red-600">
          {error || 'Allocations must sum to exactly 100%'}
        </p>
      )}
    </div>
  );
}