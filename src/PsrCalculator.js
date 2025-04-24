import React, { useState, useCallback, useMemo } from 'react';

// --- Helper Functions ---
const formatCurrency = (value) => {
    // Function to format numbers as US dollars
    if (typeof value !== 'number' || isNaN(value)) {
        return '$0.00';
    }
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// --- Reusable Calculation Logic ---
const calculateQuarterlyBreakdown = (inputs, quarterlyBP) => {
    const {
        annualSalary, projectsBooked, avgProjectRevenue, avgProjectGPPercent, simLength
    } = inputs;
    const annualBP = quarterlyBP * 4;

    // --- Input Validation (Simplified for this context - assumes valid inputs are passed) ---
    // Basic check - more robust validation happens before calling this
    if (!annualSalary || !projectsBooked || !avgProjectRevenue || !avgProjectGPPercent || !simLength || !quarterlyBP) {
        console.error("Invalid inputs passed to calculateQuarterlyBreakdown");
        return []; // Return empty array on error
    }

    // --- Initialize Simulation Variables ---
    const quarterlyResults = [];
    let consecutiveBonusHits = 0;
    let annualWeightedSalesForBonus = 0;
    let yearCumWeightedSalesForCommission = 0;
    let yearCumProjects = 0, yearCumSalesRevenue = 0, yearCumGrossProfit = 0, yearCumWeightedSalesDisplay = 0;
    let yearCumCommission = 0, yearCumQtrBase = 0, yearCumBonuses = 0, yearCumTotalEarnings = 0;
    let yearCumBronze = 0, yearCumSilver = 0, yearCumGold = 0, yearCumPlatinum = 0;

    // Bonus & Diamond Thresholds/Amounts
    const bonusThresholdPercent = 1.10;
    const bonusHitThreshold = quarterlyBP * bonusThresholdPercent;
    const goldAnnualSalesThreshold = 1000000;
    const diamondAnnualSalesThreshold = 2700000;
    const diamondBonusAmount = 10000;
    const bronzeAmount = 2000, silverAmount = 3000, goldAmount = 4000, platinumAmount = 5000;

    // Commission Rate Thresholds based on Annual BP
    const commissionRateThreshold1 = annualBP;
    const commissionRateThreshold2 = annualBP * 1.25;

    // --- Run Quarterly Simulation ---
    for (let q = 1; q <= simLength; q++) {
        const qtrBase = annualSalary / 4;
        const quarterlyRawSales = projectsBooked * avgProjectRevenue;
        const quarterlyGrossProfitDollars = quarterlyRawSales * (avgProjectGPPercent / 100);
        const quarterlyWeightedSales = quarterlyGrossProfitDollars * 2.7027;

        annualWeightedSalesForBonus += quarterlyWeightedSales;
        const startOfYearCumCommission = yearCumWeightedSalesForCommission;
        const endOfYearCumCommission = startOfYearCumCommission + quarterlyWeightedSales;

        const salesAt3Percent = Math.max(0, Math.min(endOfYearCumCommission, commissionRateThreshold1) - startOfYearCumCommission);
        const commissionPart1 = salesAt3Percent * 0.03;
        const salesAt5Percent = Math.max(0, Math.min(endOfYearCumCommission, commissionRateThreshold2) - Math.max(startOfYearCumCommission, commissionRateThreshold1));
        const commissionPart2 = salesAt5Percent * 0.05;
        const salesAt8Percent = Math.max(0, endOfYearCumCommission - Math.max(startOfYearCumCommission, commissionRateThreshold2));
        const commissionPart3 = salesAt8Percent * 0.08;
        const qtrCommission = commissionPart1 + commissionPart2 + commissionPart3;
        yearCumWeightedSalesForCommission = endOfYearCumCommission;

        let bronzeBonus = 0, silverBonus = 0, goldBonus = 0, platinumBonus = 0;
        let isHit = quarterlyWeightedSales >= bonusHitThreshold;
        let isGoldOverride = annualWeightedSalesForBonus >= goldAnnualSalesThreshold;
        let quarterlyBonusAmount = 0;
        let bonusType = 'None';

        if (isHit) { consecutiveBonusHits++; } else { consecutiveBonusHits = 0; }

        if (consecutiveBonusHits >= 26) {
            quarterlyBonusAmount = platinumAmount; bonusType = 'Platinum';
        } else if (consecutiveBonusHits >= 13 || isGoldOverride) {
            quarterlyBonusAmount = goldAmount; bonusType = 'Gold';
        } else if (consecutiveBonusHits >= 4) {
            quarterlyBonusAmount = silverAmount; bonusType = 'Silver';
        } else if (consecutiveBonusHits >= 1) {
            quarterlyBonusAmount = bronzeAmount; bonusType = 'Bronze';
        }

        bronzeBonus = (bonusType === 'Bronze') ? quarterlyBonusAmount : 0;
        silverBonus = (bonusType === 'Silver') ? quarterlyBonusAmount : 0;
        goldBonus = (bonusType === 'Gold') ? quarterlyBonusAmount : 0;
        platinumBonus = (bonusType === 'Platinum') ? quarterlyBonusAmount : 0;

        const totalQtrEarnings = qtrBase + qtrCommission + quarterlyBonusAmount;

        // Accumulate yearly totals
        yearCumProjects += projectsBooked; yearCumSalesRevenue += quarterlyRawSales; yearCumGrossProfit += quarterlyGrossProfitDollars; yearCumWeightedSalesDisplay += quarterlyWeightedSales;
        yearCumCommission += qtrCommission; yearCumQtrBase += qtrBase;
        yearCumTotalEarnings += totalQtrEarnings;
        yearCumBronze += bronzeBonus; yearCumSilver += silverBonus; yearCumGold += goldBonus; yearCumPlatinum += platinumBonus;
        yearCumBonuses += quarterlyBonusAmount;

        quarterlyResults.push({
            q, projectsBooked, quarterlyRawSales, quarterlyGrossProfitDollars, quarterlyWeightedSales,
            qtrCommission, qtrBase,
            bronzeBonus, silverBonus, goldBonus, platinumBonus,
            totalQtrEarnings
        });

        if (q % 4 === 0) {
            let currentYearDiamondBonus = 0;
            if (annualWeightedSalesForBonus >= diamondAnnualSalesThreshold) {
                currentYearDiamondBonus = diamondBonusAmount;
                yearCumTotalEarnings += currentYearDiamondBonus;
            }
             quarterlyResults.push({
                 q: `Year ${q / 4} End`, isYearly: true,
                 projectsBooked: yearCumProjects, quarterlyRawSales: yearCumSalesRevenue, quarterlyGrossProfitDollars: yearCumGrossProfit, quarterlyWeightedSales: annualWeightedSalesForBonus,
                 qtrCommission: yearCumCommission, qtrBase: yearCumQtrBase,
                 bronzeBonus: yearCumBronze, silverBonus: yearCumSilver, goldBonus: yearCumGold, platinumBonus: yearCumPlatinum,
                 diamondBonus: currentYearDiamondBonus,
                 totalQtrEarnings: yearCumTotalEarnings
             });

             // Reset ANNUAL accumulators
             annualWeightedSalesForBonus = 0; yearCumWeightedSalesForCommission = 0;
             yearCumProjects = 0; yearCumSalesRevenue = 0; yearCumGrossProfit = 0;
             yearCumCommission = 0; yearCumQtrBase = 0; yearCumTotalEarnings = 0;
             yearCumBronze = 0; yearCumSilver = 0; yearCumGold = 0; yearCumPlatinum = 0;
        }
    } // End quarterly simulation loop

    return quarterlyResults;
};


// --- Main Component ---
function PsrCalculator() {
    // --- State for Inputs ---
    const [inputs, setInputs] = useState({
        annualSalary: 60000,
        projectsBooked: 5,
        avgProjectRevenue: 36000,
        avgProjectGPPercent: 37,
        simLength: 28, // Default length to show bonus progression
    });

    // --- State for Outputs ---
    const [results, setResults] = useState(null); // Stores the quarterly breakdown array
    const [error, setError] = useState(''); // Stores validation or calculation errors
    const [potentialIncreases, setPotentialIncreases] = useState(null); // Add new state

    // --- Derived State: Calculate Quarterly BP ---
    const calculatedQuarterlyBP = useMemo(() => {
        const quarterlyBase = (inputs.annualSalary || 0) / 4;
        return quarterlyBase * 10;
    }, [inputs.annualSalary]);

    // --- Input Change Handler ---
     const handleInputChange = useCallback((event) => {
        const { name, value, type } = event.target;
        let parsedValue;
        if (type === 'number' || ['annualSalary', 'projectsBooked', 'avgProjectRevenue', 'avgProjectGPPercent', 'simLength'].includes(name)) {
             parsedValue = value === '' ? '' : parseFloat(value);
        } else {
            parsedValue = value;
        }
        setInputs(prevInputs => ({ ...prevInputs, [name]: parsedValue }));
        setError(''); // Clear error on input change
        setResults(null); // Clear results on input change
        setPotentialIncreases(null); // Clear potential increases on input change
    }, []);

    // --- "What-If" Calculation Function ---
    const calculatePotentialIncreases = useCallback((baseInputs, baseQuarterlyBP, baseResults) => {
        // Find the base first year's earnings
        const baseYear1Result = baseResults?.find(r => r.isYearly && r.q === 'Year 1 End');
        // Require at least 1 year of results for this analysis
        if (!baseYear1Result) return null;
        const baseYear1Earnings = baseYear1Result.totalQtrEarnings;

        // --- Define Increments ---
        const gpIncrease = 1; // Increase GP by 1%
        const revenueIncreasePercent = 5; // Increase Avg Revenue by 5%
        const projectsIncrease = 1; // Increase Projects by 1 per quarter

        let earningsWithGpIncrease = baseYear1Earnings;
        let earningsWithRevenueIncrease = baseYear1Earnings;
        let earningsWithProjectsIncrease = baseYear1Earnings;

        // Scenario 1: Increase GP %
        const inputsGpIncrease = {
            ...baseInputs,
            avgProjectGPPercent: baseInputs.avgProjectGPPercent + gpIncrease,
            simLength: 4 // Only need 1 year for comparison
        };
        const resultsGpIncrease = calculateQuarterlyBreakdown(inputsGpIncrease, baseQuarterlyBP);
        const year1GpIncrease = resultsGpIncrease.find(r => r.isYearly);
        if (year1GpIncrease) {
            earningsWithGpIncrease = year1GpIncrease.totalQtrEarnings;
        }

        // Scenario 2: Increase Average Revenue
        const inputsRevenueIncrease = {
            ...baseInputs,
            avgProjectRevenue: baseInputs.avgProjectRevenue * (1 + revenueIncreasePercent / 100),
             simLength: 4 // Only need 1 year
        };
        const resultsRevenueIncrease = calculateQuarterlyBreakdown(inputsRevenueIncrease, baseQuarterlyBP);
        const year1RevenueIncrease = resultsRevenueIncrease.find(r => r.isYearly);
        if (year1RevenueIncrease) {
            earningsWithRevenueIncrease = year1RevenueIncrease.totalQtrEarnings;
        }

        // Scenario 3: Increase Projects Booked
        const inputsProjectsIncrease = {
            ...baseInputs,
            projectsBooked: baseInputs.projectsBooked + projectsIncrease,
             simLength: 4 // Only need 1 year
        };
        const resultsProjectsIncrease = calculateQuarterlyBreakdown(inputsProjectsIncrease, baseQuarterlyBP);
        const year1ProjectsIncrease = resultsProjectsIncrease.find(r => r.isYearly);
        if (year1ProjectsIncrease) {
            earningsWithProjectsIncrease = year1ProjectsIncrease.totalQtrEarnings;
        }

        // Calculate differences
        const gpDiff = earningsWithGpIncrease - baseYear1Earnings;
        const revenueDiff = earningsWithRevenueIncrease - baseYear1Earnings;
        const projectsDiff = earningsWithProjectsIncrease - baseYear1Earnings;

        // Calculate potential total
        const potentialTotal = baseYear1Earnings + gpDiff + revenueDiff + projectsDiff;

        return {
            baseYear1Earnings,
            gpIncreaseAmount: gpDiff,
            revenueIncreaseAmount: revenueDiff,
            projectsIncreaseAmount: projectsDiff,
            potentialTotalEarnings: potentialTotal,
            // Pass increment values for display labels
            gpIncrement: gpIncrease,
            revenueIncrement: revenueIncreasePercent,
            projectsIncrement: projectsIncrease
        };

    }, []); // Depends only on the calculation logic, not component state directly


    // --- Update Calculation Logic ---
    const runCalculations = useCallback(() => {
        setError('');
        setResults(null);
        setPotentialIncreases(null); // Reset potential increases

        // Destructure inputs from state
        const {
            annualSalary,
            projectsBooked, avgProjectRevenue, avgProjectGPPercent, simLength
        } = inputs;

        // Use the calculated Quarterly BP
        const quarterlyBP = calculatedQuarterlyBP;
        const annualBP = quarterlyBP * 4; // Calculate Annual BP

        // --- Input Validation ---
        let validationError = '';
        if (annualSalary <= 0) validationError = "Annual Salary must be > 0.";
        else if (projectsBooked < 0 || !Number.isInteger(projectsBooked)) validationError = "Projects Booked must be a non-negative integer.";
        else if (avgProjectRevenue <= 0) validationError = "Average Project Revenue must be > 0.";
        else if (avgProjectGPPercent < 0 || avgProjectGPPercent > 100) validationError = "Average Project GP % must be between 0 and 100.";
        else if (simLength <= 0 || !Number.isInteger(simLength)) validationError = "Simulation Length must be a positive integer.";
        for (const key in inputs) {
           if (inputs[key] === '' || inputs[key] === null || isNaN(inputs[key])) {
               validationError = `Input for ${key} cannot be empty or invalid.`; break;
           }
        }
        if (quarterlyBP <= 0) validationError = "Calculated Quarterly BP must be positive (check Annual Salary).";
        if (annualBP <= 0) validationError = "Calculated Annual BP must be positive (check Annual Salary).";

        if (validationError) { setError(validationError); return; } // Display error and stop

        // --- Run BASE Simulation ---
        // Use the extracted function
        const baseQuarterlyResults = calculateQuarterlyBreakdown(inputs, calculatedQuarterlyBP);

        if (!baseQuarterlyResults || baseQuarterlyResults.length === 0) {
            setError("Calculation failed to produce results.");
            return;
        }

        setResults(baseQuarterlyResults); // Update state with the base results

        // --- Run "What-If" Analysis (if base calculation succeeded) ---
        // Check if simulation ran for at least 4 quarters for year 1 comparison
        if (inputs.simLength >= 4) {
             const potentialData = calculatePotentialIncreases(inputs, calculatedQuarterlyBP, baseQuarterlyResults);
             setPotentialIncreases(potentialData);
        }

    }, [inputs, calculatedQuarterlyBP, calculatePotentialIncreases]); // Add calculatePotentialIncreases dependency


    // --- Render Component ---
    return (
        <div className="font-sans">
            {/* PSR Inputs Section */}
             <h3 className="text-xl font-semibold text-gray-800 mb-3">PSR Inputs</h3>
            <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
               {/* Input Grid */}
               <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                     {/* Annual Salary Input */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="annualSalary">
                            Annual Salary ($)
                        </label>
                        <input
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                            id="annualSalary"
                            name="annualSalary"
                            value={inputs.annualSalary}
                            onChange={handleInputChange}
                        />
                    </div>

                    {/* Projects Booked Input */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="projectsBooked">
                            Projects Booked per Quarter
                        </label>
                        <input
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                            id="projectsBooked"
                            name="projectsBooked"
                            value={inputs.projectsBooked}
                            onChange={handleInputChange}
                            min="0"
                            step="1"
                        />
                    </div>

                    {/* Average Project Revenue Input */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="avgProjectRevenue">
                            Average Project Revenue ($)
                        </label>
                        <input
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                            id="avgProjectRevenue"
                            name="avgProjectRevenue"
                            value={inputs.avgProjectRevenue}
                            onChange={handleInputChange}
                        />
                    </div>

                    {/* Average Project GP % Input */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="avgProjectGPPercent">
                            Average Project GP (%)
                        </label>
                        <input
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                            step="0.1"
                            id="avgProjectGPPercent"
                            name="avgProjectGPPercent"
                            value={inputs.avgProjectGPPercent}
                            onChange={handleInputChange}
                        />
                    </div>

                    {/* Simulation Length Input */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="simLength">
                            Simulation Length (Quarters)
                        </label>
                        <input
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                            id="simLength"
                            name="simLength"
                            value={inputs.simLength}
                            onChange={handleInputChange}
                            min="1"
                            step="1"
                        />
                    </div>
               </div>
               {/* Calculate Button */}
               <div className="flex justify-center mt-6">
                    <button
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        onClick={runCalculations}
                    >
                        Calculate PSR Compensation
                    </button>
                </div>
                 {/* Error Display Area */}
                {error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-600 font-medium">{error}</p>
                    </div>
                )}
            </div>


            {/* --- Potential Increases Section (NEW) --- */}
            {potentialIncreases && results && results.length > 0 && (
                <div className="max-w-5xl mx-auto mb-6">
                    <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-300 shadow-sm">
                        <h4 className="text-lg font-semibold text-yellow-900 mb-3">Unlock Your Potential Earnings</h4>
                        <p className="text-sm text-gray-700 mb-3">
                            Based on your inputs, your estimated first-year earnings are:
                            <strong className="ml-1">{formatCurrency(potentialIncreases.baseYear1Earnings)}</strong>.
                        </p>
                        <p className="text-sm text-gray-700 mb-4">
                            However, small improvements could significantly boost your income:
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                                <span>Improving Avg. GP by <strong className="text-green-700">+{potentialIncreases.gpIncrement}%</strong> could add:</span>
                                <span className="font-medium text-green-700">+{formatCurrency(potentialIncreases.gpIncreaseAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                                <span>Increasing Avg. Project Revenue by <strong className="text-green-700">+{potentialIncreases.revenueIncrement}%</strong> could add:</span>
                                <span className="font-medium text-green-700">+{formatCurrency(potentialIncreases.revenueIncreaseAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                                <span>Booking <strong className="text-green-700">+{potentialIncreases.projectsIncrement}</strong> more project(s) per quarter could add:</span>
                                <span className="font-medium text-green-700">+{formatCurrency(potentialIncreases.projectsIncreaseAmount)}</span>
                            </div>
                        </div>
                        <hr className="my-4 border-yellow-300"/>
                        <div className="flex justify-between items-center text-base">
                            <span className="font-semibold text-yellow-900">Your potential first-year earnings could reach:</span>
                            <span className="font-bold text-xl text-green-700">{formatCurrency(potentialIncreases.potentialTotalEarnings)}</span>
                        </div>
                         <p className="text-xs text-gray-500 mt-2 italic">
                             Note: Potential total assumes achieving all listed improvements simultaneously. Individual impacts are calculated separately against the base scenario.
                         </p>
                    </div>
                </div>
            )}

            {/* --- Output Section (Main Results Table) --- */}
            {results && results.length > 0 && (
                 <div className="mt-6">
                     {/* Key Information Summary */}
                    <div className="max-w-5xl mx-auto mb-5">
                           <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="text-lg font-semibold text-blue-800 mb-2">Key Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Quarterly Base</p>
                                    <p className="font-medium">{formatCurrency(inputs.annualSalary / 4)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Quarterly BP Target</p>
                                    <p className="font-medium">{formatCurrency(calculatedQuarterlyBP)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Bonus Hit Threshold (110% of BP)</p>
                                    <p className="font-medium">{formatCurrency(calculatedQuarterlyBP * 1.1)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3 max-w-5xl mx-auto">Quarterly Simulation Results</h4>
                    {/* Responsive Table */}
                    <div className="overflow-x-auto">
                        <div className="max-w-5xl mx-auto">
                            <table className="w-full divide-y divide-gray-200 border border-gray-200">
                               <thead>
                                    <tr className="bg-gray-50">
                                        {/* Table Headers */}
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Quarter</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Projects</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sales Rev</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Gross Profit</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Weighted Sales</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Commission</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Bonus</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Earnings</th>
                                </tr>
                            </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {/* Map through results array to render table rows */}
                                {results.map((row, index) => {
                                    // Determine which bonus was earned
                                    let bonusAmount = 0;
                                    let bonusType = '';

                                    if (row.bronzeBonus > 0) {
                                        bonusAmount = row.bronzeBonus;
                                        bonusType = 'Bronze';
                                    } else if (row.silverBonus > 0) {
                                        bonusAmount = row.silverBonus;
                                        bonusType = 'Silver';
                                    } else if (row.goldBonus > 0) {
                                        bonusAmount = row.goldBonus;
                                        bonusType = 'Gold';
                                    } else if (row.platinumBonus > 0) {
                                        bonusAmount = row.platinumBonus;
                                        bonusType = 'Platinum';
                                    }

                                    // Add diamond bonus for yearly rows
                                    if (row.isYearly && row.diamondBonus > 0) {
                                        bonusAmount += row.diamondBonus;
                                        bonusType = bonusType ? `${bonusType} + Diamond` : 'Diamond';
                                    }

                                    return (
                                        <tr
                                            key={index}
                                            className={row.isYearly ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}
                                        >
                                            <td className="px-4 py-3 text-base text-left whitespace-nowrap">
                                                {row.isYearly ? (
                                                    <span className="font-medium text-blue-700">{row.q}</span>
                                                ) : (
                                                    row.q
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-base text-right">{row.projectsBooked?.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-base text-right">{formatCurrency(row.quarterlyRawSales)}</td>
                                            <td className="px-4 py-3 text-base text-right">{formatCurrency(row.quarterlyGrossProfitDollars)}</td>
                                            <td className="px-4 py-3 text-base text-right">{formatCurrency(row.quarterlyWeightedSales)}</td>
                                            <td className="px-4 py-3 text-base text-right">{formatCurrency(row.qtrCommission)}</td>
                                            <td className="px-4 py-3 text-base text-right">
                                                {bonusAmount > 0 ? (
                                                    <div>
                                                        <span className="font-medium">{formatCurrency(bonusAmount)}</span>
                                                        {bonusType && (
                                                            <span className="ml-1 text-sm text-gray-500">({bonusType})</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    formatCurrency(0)
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-base text-right font-medium">
                                                {formatCurrency(row.totalQtrEarnings)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PsrCalculator;
