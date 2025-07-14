import React, { memo } from 'react';

const CONDITION_OPTIONS = [
  { short: 'FN', full: 'Factory New' },
  { short: 'MW', full: 'Minimal Wear' },
  { short: 'FT', full: 'Field-Tested' },
  { short: 'WW', full: 'Well-Worn' },
  { short: 'BS', full: 'Battle-Scarred' }
];

const ConditionSelector = memo(({ selectedCondition, onConditionChange, required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      Condition {required && <span className="text-red-400">*</span>}
    </label>
    <div className="flex items-center gap-2 flex-wrap">
      {CONDITION_OPTIONS.map(({ short, full }) => (
        <button
          key={short}
          type="button"
          onClick={() => onConditionChange(full)}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
            selectedCondition === full
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          {short}
        </button>
      ))}
    </div>
    {selectedCondition && (
      <p className="text-gray-400 text-xs mt-2">Selected: {selectedCondition}</p>
    )}
  </div>
));

ConditionSelector.displayName = 'ConditionSelector';

export default ConditionSelector;