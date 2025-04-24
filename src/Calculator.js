import React, { useState } from 'react';
// Import the actual calculator components
import MsrCalculator from './MsrCalculator';
import PsrCalculator from './PsrCalculator';

function Calculator() {
  const [activeTab, setActiveTab] = useState('msr'); // 'msr' or 'psr'

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  // Common classes for tab buttons
  const tabBaseClasses = "px-4 py-2 text-base font-medium border-b-2 transition-colors duration-150 ease-in-out focus:outline-none";
  const tabInactiveClasses = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";
  const tabActiveClasses = "border-blue-600 text-blue-600";

  return (
    <div className="p-5 font-sans">
      {/* Main Title */}
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Sales Commission Calculator</h1>

      {/* Tab Navigation Container */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
          {/* MSR Tab Button */}
          <button
            className={`${tabBaseClasses} ${activeTab === 'msr' ? tabActiveClasses : tabInactiveClasses}`}
            onClick={() => handleTabClick('msr')}
          >
            MSR Commission Calculator
          </button>

          {/* PSR Tab Button */}
          <button
            className={`${tabBaseClasses} ${activeTab === 'psr' ? tabActiveClasses : tabInactiveClasses}`}
            onClick={() => handleTabClick('psr')}
          >
            PSR Commission Calculator
          </button>
        </nav>
      </div>

      {/* Content Area - Renders the active calculator */}
      <div className="mt-4">
        {activeTab === 'msr' && (
          <MsrCalculator />
        )}
        {activeTab === 'psr' && (
          <PsrCalculator />
        )}
      </div>
    </div>
  );
}

export default Calculator;
