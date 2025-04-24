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


// --- Reusable MSR Calculation Logic ---
const calculateMsrQuarterlyBreakdown = (
    inputs,
    quarterlyTier1Target, // Pass the calculated target
    // Pass hardcoded constants
    gMult, cMult,
    quotaMult1, quotaMult2, quotaMult3,
    commTier1, commTier2, commTier3,
    simLength // Use simLength from inputs or override
) => {
    const {
        baseSalary, avgTicketPrice, dialTarget,
        d2c, c2a, a2p, p2b,
        gDealPct
    } = inputs;

    // --- Basic Input Check (Assume core validation done prior) ---
    if (!baseSalary || !avgTicketPrice || !dialTarget || d2c == null || c2a == null || a2p == null || p2b == null || gDealPct == null || !quarterlyTier1Target) {
        console.error("Invalid inputs passed to calculateMsrQuarterlyBreakdown");
        return []; // Return empty array on basic error
    }

    // --- Calculate Annual Quota Targets ---
    const tier1Target = baseSalary * quotaMult1;
    const tier2Target = baseSalary * quotaMult2;
    const tier3Target = baseSalary * quotaMult3;

    // Bonus & Diamond Thresholds/Amounts
    const bonusThresholdPercent = 1.10;
    const bonusHitThreshold = quarterlyTier1Target * bonusThresholdPercent;
    const bronzeAmount = 2000, silverAmount = 3000, goldAmount = 4000, platinumAmount = 5000;

    // --- Initialize Simulation Variables ---
    const quarterlyResults = [];
    let yearCumWeightedSales = 0, yearCumTier1Comm = 0, yearCumTier2Comm = 0, yearCumTier3Comm = 0, yearCumTotalComm = 0;
    let yearCumQtrBase = 0, yearCumBronzeBonus = 0, yearCumSilverBonus = 0, yearCumGoldBonus = 0, yearCumPlatinumBonus = 0, yearCumTotalEarnings = 0;
    let yearCumDials = 0, yearCumContacts = 0, yearCumAppointments = 0, yearCumProposals = 0, yearCumBookings = 0, yearCumSalesRevenue = 0;
    let consecutiveTier1 = 0;
    let consecutiveSilver = 0;

    // --- Run Quarterly Simulation ---
    for (let q = 1; q <= simLength; q++) {
      const dials = dialTarget;
      // Divide percentages by 100 when used in calculations
      const d2cDecimal = d2c / 100;
      const c2aDecimal = c2a / 100;
      const a2pDecimal = a2p / 100;
      const p2bDecimal = p2b / 100;
      const gDealPctDecimal = gDealPct / 100;

      const contacts = Math.round(dials * d2cDecimal);
      const appointments = Math.round(contacts * c2aDecimal);
      const proposals = Math.round(appointments * a2pDecimal);
      const bookings = Math.round(proposals * p2bDecimal);
      const salesRevenue = bookings * avgTicketPrice;
      // Use decimal versions in weighted sales calculation
      const weightedSales = salesRevenue * ((gDealPctDecimal * gMult) + ((1 - gDealPctDecimal) * cMult));

      yearCumWeightedSales += weightedSales;

      let currentYearTier1Comm = 0, currentYearTier2Comm = 0, currentYearTier3Comm = 0;
      if (yearCumWeightedSales <= tier1Target) { currentYearTier1Comm = yearCumWeightedSales * commTier1; }
      else if (yearCumWeightedSales <= tier2Target) { currentYearTier1Comm = tier1Target * commTier1; currentYearTier2Comm = (yearCumWeightedSales - tier1Target) * commTier2; }
      else { currentYearTier1Comm = tier1Target * commTier1; currentYearTier2Comm = (tier2Target - tier1Target) * commTier2; currentYearTier3Comm = (yearCumWeightedSales - tier2Target) * commTier3; }
      const currentYearTotalComm = currentYearTier1Comm + currentYearTier2Comm + currentYearTier3Comm;
      const quarterlyTier1Comm = currentYearTier1Comm - yearCumTier1Comm;
      const quarterlyTier2Comm = currentYearTier2Comm - yearCumTier2Comm;
      const quarterlyTier3Comm = currentYearTier3Comm - yearCumTier3Comm;
      const quarterlyTotalComm = currentYearTotalComm - yearCumTotalComm;

      const qtrBase = baseSalary / 4;

      let bronzeBonus = 0, silverBonus = 0, goldBonus = 0, platinumBonus = 0;
      let isHit = weightedSales >= bonusHitThreshold;

      if (isHit) {
          consecutiveTier1++;
          if (consecutiveTier1 >= 4) {
              consecutiveSilver++;
              bronzeBonus = 0;
              silverBonus = silverAmount;
              if (consecutiveSilver >= 9) {
                  silverBonus = 0;
                  goldBonus = goldAmount;
                  if (consecutiveSilver >= 13) {
                      goldBonus = 0;
                      platinumBonus = platinumAmount;
                  }
              }
          } else {
              bronzeBonus = bronzeAmount;
              silverBonus = 0; goldBonus = 0; platinumBonus = 0;
          }
      } else {
          consecutiveTier1 = 0; consecutiveSilver = 0;
          bronzeBonus = 0; silverBonus = 0; goldBonus = 0; platinumBonus = 0;
      }

      const totalQtrEarnings = qtrBase + quarterlyTotalComm + bronzeBonus + silverBonus + goldBonus + platinumBonus;

      yearCumDials += dials; yearCumContacts += contacts; yearCumAppointments += appointments; yearCumProposals += proposals; yearCumBookings += bookings;
      yearCumSalesRevenue += salesRevenue; yearCumQtrBase += qtrBase;
      yearCumTotalEarnings += totalQtrEarnings;
      yearCumBronzeBonus += bronzeBonus; yearCumSilverBonus += silverBonus; yearCumGoldBonus += goldBonus; yearCumPlatinumBonus += platinumBonus;
      yearCumTier1Comm = currentYearTier1Comm; yearCumTier2Comm = currentYearTier2Comm; yearCumTier3Comm = currentYearTier3Comm; yearCumTotalComm = currentYearTotalComm;

      quarterlyResults.push({
        q, dials, contacts, appointments, proposals, bookings,
        salesRevenue, weightedSales,
        quarterlyTier1Comm, quarterlyTier2Comm, quarterlyTier3Comm, quarterlyTotalComm,
        qtrBase, bronzeBonus, silverBonus, goldBonus, platinumBonus,
        totalQtrEarnings
      });

      if (q % 4 === 0) {
        quarterlyResults.push({
          q: `Year ${q/4} End`, isYearly: true,
          dials: yearCumDials, contacts: yearCumContacts, appointments: yearCumAppointments, proposals: yearCumProposals, bookings: yearCumBookings,
          salesRevenue: yearCumSalesRevenue, weightedSales: yearCumWeightedSales,
          quarterlyTier1Comm: yearCumTier1Comm, quarterlyTier2Comm: yearCumTier2Comm, quarterlyTier3Comm: yearCumTier3Comm, quarterlyTotalComm: yearCumTotalComm,
          qtrBase: yearCumQtrBase,
          bronzeBonus: yearCumBronzeBonus, silverBonus: yearCumSilverBonus, goldBonus: yearCumGoldBonus, platinumBonus: yearCumPlatinumBonus,
          totalQtrEarnings: yearCumTotalEarnings
        });

        yearCumWeightedSales = 0; yearCumTier1Comm = 0; yearCumTier2Comm = 0; yearCumTier3Comm = 0; yearCumTotalComm = 0;
        yearCumQtrBase = 0; yearCumBronzeBonus = 0; yearCumSilverBonus = 0; yearCumGoldBonus = 0; yearCumPlatinumBonus = 0; yearCumTotalEarnings = 0;
        yearCumDials = 0; yearCumContacts = 0; yearCumAppointments = 0; yearCumProposals = 0; yearCumBookings = 0; yearCumSalesRevenue = 0;
        // consecutiveTier1 and consecutiveSilver PERSIST across years
      }
    } // End quarterly simulation loop

    return quarterlyResults;
};


// --- Main Component ---
function MsrCalculator() {
    // --- State for Inputs ---
    // Hardcoded values
    const gMult = 3; const cMult = 2;
    const quotaMult1 = 10; const quotaMult2 = 12.5; const quotaMult3 = 15;
    const commTier1 = 0.06; const commTier2 = 0.08; const commTier3 = 0.10;
    const simLength = 28; // Default simulation length

    const [inputs, setInputs] = useState({
        baseSalary: 70000,
        avgTicketPrice: 6500,
        dialTarget: 600,
        d2c: 20, c2a: 60, a2p: 60, p2b: 30, gDealPct: 75, // Store as whole numbers
    });

    // --- State for Outputs ---
    const [results, setResults] = useState(null);
    const [scenarioResults, setScenarioResults] = useState(null);
    const [potentialIncreases, setPotentialIncreases] = useState(null); // State for What-If
    const [error, setError] = useState('');

    // --- Derived State: Calculate Quarterly Tier 1 Target ---
    const calculatedQuarterlyTier1Target = useMemo(() => {
        const annualTier1Target = (inputs.baseSalary || 0) * quotaMult1;
        return annualTier1Target / 4;
    }, [inputs.baseSalary, quotaMult1]); // Added quotaMult1 dependency

    // --- Input Change Handler ---
    const handleInputChange = useCallback((event) => {
        const { name, value } = event.target; // Removed 'type' as name check is primary
        let parsedValue;
        let isValid = true; // Flag to track if input is valid

        // Check if it's a percentage field FIRST
        if (['d2c', 'c2a', 'a2p', 'p2b', 'gDealPct'].includes(name)) {
            parsedValue = value === '' ? '' : parseFloat(value);
            if (parsedValue !== '') {
                if (isNaN(parsedValue)) {
                    setError(`Invalid percentage value for ${name}. Please enter a number.`);
                    isValid = false;
                } else {
                    // Store the parsed value directly (as a whole number)
                    // Optional: Add validation for range 0-100
                    // if (parsedValue < 0 || parsedValue > 100) {
                    //     setError(`Percentage for ${name} must be between 0 and 100.`);
                    //     isValid = false;
                    // }
                }
            }
        }
        // Handle other numeric fields (baseSalary, avgTicketPrice, dialTarget)
        else if (['baseSalary', 'avgTicketPrice', 'dialTarget'].includes(name)) {
             parsedValue = value === '' ? '' : parseFloat(value);
             if (parsedValue !== '' && isNaN(parsedValue)) {
                 setError(`Invalid number for ${name}. Please enter a number.`);
                 isValid = false;
             }
        }
        // Handle any other potential input types (if any added later)
        else {
             parsedValue = value;
        }

        // Only update state and clear results if the input was valid
        if (isValid) {
            setInputs(prevInputs => ({
                ...prevInputs,
                [name]: parsedValue
            }));
            setError(''); // Clear error only on successful parse/update
            setResults(null);
            setScenarioResults(null);
            setPotentialIncreases(null); // Clear potential increases on input change
        }
        // If not valid, the error message set above will persist
    }, [setError]); // Added setError dependency

    // --- "What-If" Calculation Function ---
    const calculateMsrPotentialIncreases = useCallback((baseInputs, baseQuarterlyTier1Target, baseResults) => {
        const baseYear1Result = baseResults?.find(r => r.isYearly && r.q === 'Year 1 End');
        if (!baseYear1Result) return null;
        const baseYear1Earnings = baseYear1Result.totalQtrEarnings;

        // --- Define Increments ---
        const dialsIncrease = 50; // +50 Dials per Quarter
        const p2bIncreasePercent = 5; // +5% points increase (e.g., 75% -> 80%)
        const gDealPctIncreasePercent = 5; // +5% points increase (e.g., 70% -> 75%)

        let earningsWithDialsIncrease = baseYear1Earnings;
        let earningsWithP2bIncrease = baseYear1Earnings;
        let earningsWithGDealIncrease = baseYear1Earnings;

        // Get hardcoded constants needed for the simulation function
        const constants = { gMult, cMult, quotaMult1, quotaMult2, quotaMult3, commTier1, commTier2, commTier3 };

        // Scenario 1: Increase Dials
        const inputsDialsIncrease = {
            ...baseInputs,
            dialTarget: baseInputs.dialTarget + dialsIncrease
        };
        const resultsDialsIncrease = calculateMsrQuarterlyBreakdown(inputsDialsIncrease, baseQuarterlyTier1Target, ...Object.values(constants), 4); // Run for 1 year (4 quarters)
        const year1DialsIncrease = resultsDialsIncrease.find(r => r.isYearly);
        if (year1DialsIncrease) {
            earningsWithDialsIncrease = year1DialsIncrease.totalQtrEarnings;
        }

        // Scenario 2: Increase P2B %
        const inputsP2bIncrease = {
            ...baseInputs,
            // Ensure p2b doesn't exceed 1 (100%)
            // Divide base P2B by 100, add increase %, ensure max 100, then store as whole number
            p2b: Math.min(100, (baseInputs.p2b / 100 + p2bIncreasePercent / 100) * 100)
        };
        const resultsP2bIncrease = calculateMsrQuarterlyBreakdown(inputsP2bIncrease, baseQuarterlyTier1Target, ...Object.values(constants), 4);
        const year1P2bIncrease = resultsP2bIncrease.find(r => r.isYearly);
        if (year1P2bIncrease) {
            earningsWithP2bIncrease = year1P2bIncrease.totalQtrEarnings;
        }

        // Scenario 3: Increase G Deal %
        const inputsGDealIncrease = {
            ...baseInputs,
            // Ensure gDealPct doesn't exceed 1 (100%)
            // Divide base GDeal by 100, add increase %, ensure max 100, then store as whole number
            gDealPct: Math.min(100, (baseInputs.gDealPct / 100 + gDealPctIncreasePercent / 100) * 100)
        };
        const resultsGDealIncrease = calculateMsrQuarterlyBreakdown(inputsGDealIncrease, baseQuarterlyTier1Target, ...Object.values(constants), 4);
        const year1GDealIncrease = resultsGDealIncrease.find(r => r.isYearly);
        if (year1GDealIncrease) {
            earningsWithGDealIncrease = year1GDealIncrease.totalQtrEarnings;
        }

        // Calculate differences
        const dialsDiff = earningsWithDialsIncrease - baseYear1Earnings;
        const p2bDiff = earningsWithP2bIncrease - baseYear1Earnings;
        const gDealDiff = earningsWithGDealIncrease - baseYear1Earnings;

        // Calculate potential total
        const potentialTotal = baseYear1Earnings + dialsDiff + p2bDiff + gDealDiff;

        return {
            baseYear1Earnings,
            dialsIncreaseAmount: dialsDiff,
            p2bIncreaseAmount: p2bDiff,
            gDealIncreaseAmount: gDealDiff,
            potentialTotalEarnings: potentialTotal,
            // Pass increment values for display labels
            dialsIncrement: dialsIncrease,
            p2bIncrement: p2bIncreasePercent,
            gDealIncrement: gDealPctIncreasePercent
        };

    }, [gMult, cMult, quotaMult1, quotaMult2, quotaMult3, commTier1, commTier2, commTier3]); // Dependencies are the constants


    // --- Main Calculation Logic ---
    const runCalculations = useCallback(() => {
        setError('');
        setResults(null);
        setScenarioResults(null);
        setPotentialIncreases(null); // Reset potential increases

        // Destructure inputs
        const { baseSalary, /* ...other inputs... */ } = inputs;

        // Use calculated Tier 1 Target
        const quarterlyTier1Target = calculatedQuarterlyTier1Target;

        // --- Input Validation ---
        let validationError = '';
        // (Keep existing validation logic...)
        if (baseSalary <= 0) validationError = "Base Salary must be > 0.";
        // ... other validation checks ...
        for (const key in inputs) {
           if (inputs[key] === '' || inputs[key] === null || isNaN(inputs[key])) {
               validationError = `Input for ${key} cannot be empty or invalid.`; break;
           }
        }
        if (quarterlyTier1Target <= 0) validationError = "Calculated Quarterly Tier 1 Target must be positive.";

        if (validationError) { setError(validationError); return; }

        // --- Calculate Scenario Table (Keep existing logic) ---
        const tier1Target = baseSalary * quotaMult1;
        const tier2Target = baseSalary * quotaMult2;
        const tier3Target = baseSalary * quotaMult3;
        const scenarios = [600000, 800000, 1000000, 1200000, 1500000];
        const calculatedScenarios = scenarios.map(annualWeightedSales => {
            const compensation = calculateYearCompensation(
                annualWeightedSales, baseSalary,
                tier1Target, tier2Target, tier3Target,
                commTier1, commTier2, commTier3,
                2000, 3000 // Pass bronze/silver amounts for simplified bonus calc
            );
            return { annualWeightedSales, compensation };
        });
        setScenarioResults(calculatedScenarios);

        // --- Run BASE Simulation using extracted function ---
        const baseQuarterlyResults = calculateMsrQuarterlyBreakdown(
            inputs,
            quarterlyTier1Target,
            gMult, cMult, quotaMult1, quotaMult2, quotaMult3,
            commTier1, commTier2, commTier3,
            simLength // Use the default simLength
        );

        if (!baseQuarterlyResults || baseQuarterlyResults.length === 0) {
            setError("Calculation failed to produce results.");
            return;
        }
        setResults(baseQuarterlyResults); // Update state with base results

        // --- Run "What-If" Analysis (if base calculation succeeded & simLength >= 4) ---
        if (simLength >= 4) {
             const potentialData = calculateMsrPotentialIncreases(inputs, quarterlyTier1Target, baseQuarterlyResults);
             setPotentialIncreases(potentialData);
        }

    }, [inputs, calculatedQuarterlyTier1Target, calculateMsrPotentialIncreases, gMult, cMult, quotaMult1, quotaMult2, quotaMult3, commTier1, commTier2, commTier3, simLength]); // Added dependencies


    // --- Helper function to calculate Year Compensation for Scenario Table ---
    const calculateYearCompensation = (
      annualWeightedSales, baseSalary,
      tier1Target, tier2Target, tier3Target,
      commTier1, commTier2, commTier3,
      passedBronzeAmount, passedSilverAmount
      ) => {
       // (Keep existing calculateYearCompensation logic...)
       let yearlyBase = baseSalary;
       let commissionTotal = 0;
       let bonusTotal = 0;
       let yearTier1Comm = 0, yearTier2Comm = 0, yearTier3Comm = 0;

       if (annualWeightedSales <= tier1Target) { yearTier1Comm = annualWeightedSales * commTier1; }
       else if (annualWeightedSales <= tier2Target) { yearTier1Comm = tier1Target * commTier1; yearTier2Comm = (annualWeightedSales - tier1Target) * commTier2; }
       else { yearTier1Comm = tier1Target * commTier1; yearTier2Comm = (tier2Target - tier1Target) * commTier2; yearTier3Comm = (annualWeightedSales - tier2Target) * commTier3; }
       commissionTotal = yearTier1Comm + yearTier2Comm + yearTier3Comm;

       let quarterlyWeightedSales = annualWeightedSales / 4;
       let quarterlyTier1TargetCalc = tier1Target / 4;
       let bonusThreshold = quarterlyTier1TargetCalc * 1.1;
       if (quarterlyWeightedSales >= bonusThreshold) {
           bonusTotal = (passedBronzeAmount * 3) + passedSilverAmount;
        } else {
            bonusTotal = 0;
        }
       return yearlyBase + commissionTotal + bonusTotal;
    };


    // --- Render Component ---
    return (
        <div className="font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* MSR Inputs Section (Keep As Is) */}
             <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">MSR Inputs</h3>
             <div className="bg-gray-50 rounded-lg shadow-md border border-gray-200 p-6 mb-8">
                {/* Input Grid (Keep As Is) */}
                <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                   {/* Input Fields (Keep As Is) */}
                    {/* Base Salary */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="baseSalary">Base Salary ($)</label>
                        <input className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="number" id="baseSalary" name="baseSalary" value={inputs.baseSalary} onChange={handleInputChange}/>
                    </div>
                    {/* Avg Ticket Price */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="avgTicketPrice">Average Ticket Price ($)</label>
                        <input className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="number" id="avgTicketPrice" name="avgTicketPrice" value={inputs.avgTicketPrice} onChange={handleInputChange}/>
                    </div>
                    {/* Dial Target */}
                     <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="dialTarget">Dials per Quarter</label>
                        <input className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="number" id="dialTarget" name="dialTarget" value={inputs.dialTarget} onChange={handleInputChange}/>
                    </div>
                    {/* d2c */}
                     <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="d2c">Dial-to-Contact (%)</label>
                        <input className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="number" step="0.1" id="d2c" name="d2c" value={inputs.d2c} onChange={handleInputChange}/>
                    </div>
                    {/* c2a */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="c2a">Contact-to-Appointment (%)</label>
                        <input className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="number" step="0.1" id="c2a" name="c2a" value={inputs.c2a} onChange={handleInputChange}/>
                    </div>
                    {/* a2p */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="a2p">Appointment-to-Proposal (%)</label>
                        <input className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="number" step="0.1" id="a2p" name="a2p" value={inputs.a2p} onChange={handleInputChange}/>
                    </div>
                    {/* p2b */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="p2b">Proposal-to-Booking (%)</label>
                        <input className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="number" step="0.1" id="p2b" name="p2b" value={inputs.p2b} onChange={handleInputChange}/>
                    </div>
                    {/* gDealPct */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="gDealPct">G Deal (%)</label>
                        <input className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="number" step="0.1" id="gDealPct" name="gDealPct" value={inputs.gDealPct} onChange={handleInputChange}/>
                    </div>
                </div>
                 {/* Calculate Button (Keep As Is) */}
                 <div className="flex justify-center mt-6">
                     <button className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" onClick={runCalculations}>Calculate MSR Compensation</button>
                 </div>
                 {/* Error Display (Keep As Is) */}
                  {error && ( <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md"><p className="text-red-600 font-medium">{error}</p></div> )}
            </div>

            {/* --- Potential Increases Section (NEW) --- */}
            {potentialIncreases && results && results.length > 0 && (
                <div className="max-w-4xl mx-auto mb-8"> {/* Centered, consistent width */}
                    <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-300 shadow-sm">
                        <h4 className="text-lg font-semibold text-yellow-900 mb-3 text-center">Unlock Your Potential Earnings</h4> {/* Centered */}
                        <p className="text-sm text-gray-700 mb-3 text-center"> {/* Centered */}
                            Based on your inputs, your estimated first-year earnings are:
                            <strong className="ml-1">{formatCurrency(potentialIncreases.baseYear1Earnings)}</strong>.
                        </p>
                        <p className="text-sm text-gray-700 mb-4 text-center"> {/* Centered */}
                            Small improvements in key activities could significantly boost your income:
                        </p>
                        <div className="space-y-2 text-sm max-w-lg mx-auto"> {/* Centered content */}
                            <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                                <span>Making <strong className="text-green-700">+{potentialIncreases.dialsIncrement}</strong> more dials per quarter could add:</span>
                                <span className="font-medium text-green-700">+{formatCurrency(potentialIncreases.dialsIncreaseAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                                <span>Improving Proposal-to-Booking by <strong className="text-green-700">+{potentialIncreases.p2bIncrement}%</strong> could add:</span>
                                <span className="font-medium text-green-700">+{formatCurrency(potentialIncreases.p2bIncreaseAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                                <span>Increasing G Deal % by <strong className="text-green-700">+{potentialIncreases.gDealIncrement}%</strong> could add:</span>
                                <span className="font-medium text-green-700">+{formatCurrency(potentialIncreases.gDealIncreaseAmount)}</span>
                            </div>
                        </div>
                        <hr className="my-4 border-yellow-300 max-w-lg mx-auto"/> {/* Centered */}
                        <div className="flex flex-col sm:flex-row justify-between items-center text-base max-w-lg mx-auto"> {/* Centered, responsive layout */}
                            <span className="font-semibold text-yellow-900 mb-1 sm:mb-0">Your potential first-year earnings could reach:</span>
                            <span className="font-bold text-xl text-green-700">{formatCurrency(potentialIncreases.potentialTotalEarnings)}</span>
                        </div>
                         <p className="text-xs text-gray-500 mt-3 italic text-center"> {/* Centered */}
                             Note: Potential total assumes achieving all listed improvements simultaneously. Individual impacts are calculated separately against the base scenario.
                         </p>
                    </div>
                </div>
            )}


            {/* --- Output Section --- */}
            {/* Scenario Table (Keep As Is - already placed correctly) */}
            {scenarioResults && (
                <div className="mt-6">
                    {/* Key Information Summary (Keep As Is) */}
                    <div className="max-w-4xl mx-auto mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                             <h4 className="text-lg font-semibold text-blue-800 mb-3 text-center">Key Information</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-gray-600">Quarterly Base</p>
                                    <p className="font-medium text-lg">{formatCurrency(inputs.baseSalary / 4)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Quarterly Tier 1 Target</p>
                                    <p className="font-medium text-lg">{formatCurrency(calculatedQuarterlyTier1Target)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Bonus Hit Threshold (110%)</p>
                                    <p className="font-medium text-lg">{formatCurrency(calculatedQuarterlyTier1Target * 1.1)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Scenario Table Display (Keep As Is) */}
                    
                </div>
            )}

            {/* Quarterly Results Table (Keep As Is) */}
            {results && results.length > 0 && (
               <div className="mt-8">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">Quarterly Simulation Results</h4>
                    <div className="overflow-x-auto flex justify-center">
                        <div className="w-full max-w-6xl">
                           <table className="min-w-full divide-y divide-gray-200 border border-gray-200 shadow-sm rounded-lg">
                              {/* ... thead ... */}
                              <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Quarter</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Dials</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Contacts</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Appts</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Props</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Bookings</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sales Rev</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Weighted Sales</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Commission</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Bonus</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Earnings</th>
                                    </tr>
                                </thead>
                              {/* ... tbody ... */}
                              <tbody className="bg-white divide-y divide-gray-200">
                                    {results.map((row, index) => {
                                        let bonusAmount = 0; let bonusType = '';
                                        if (row.bronzeBonus > 0) { bonusAmount = row.bronzeBonus; bonusType = 'Bronze'; }
                                        else if (row.silverBonus > 0) { bonusAmount = row.silverBonus; bonusType = 'Silver'; }
                                        else if (row.goldBonus > 0) { bonusAmount = row.goldBonus; bonusType = 'Gold'; }
                                        else if (row.platinumBonus > 0) { bonusAmount = row.platinumBonus; bonusType = 'Platinum'; }
                                        const totalCommission = row.quarterlyTier1Comm + row.quarterlyTier2Comm + row.quarterlyTier3Comm;

                                        return (
                                            <tr key={index} className={row.isYearly ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}>
                                                <td className="px-2 py-2 text-sm text-left whitespace-nowrap">{row.isYearly ? <span className="font-bold text-blue-800">{row.q}</span> : row.q}</td>
                                                <td className="px-2 py-2 text-sm text-right whitespace-nowrap">{row.dials?.toLocaleString()}</td>
                                                <td className="px-2 py-2 text-sm text-right whitespace-nowrap">{row.contacts?.toLocaleString()}</td>
                                                <td className="px-2 py-2 text-sm text-right whitespace-nowrap">{row.appointments?.toLocaleString()}</td>
                                                <td className="px-2 py-2 text-sm text-right whitespace-nowrap">{row.proposals?.toLocaleString()}</td>
                                                <td className="px-2 py-2 text-sm text-right whitespace-nowrap">{row.bookings?.toLocaleString()}</td>
                                                <td className="px-2 py-2 text-sm text-right whitespace-nowrap">{formatCurrency(row.salesRevenue)}</td>
                                                <td className="px-2 py-2 text-sm text-right whitespace-nowrap">{formatCurrency(row.weightedSales)}</td>
                                                <td className="px-2 py-2 text-sm text-right whitespace-nowrap">{formatCurrency(totalCommission)}</td>
                                                <td className="px-2 py-2 text-sm text-right whitespace-nowrap">
                                                    {bonusAmount > 0 ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-medium">{formatCurrency(bonusAmount)}</span>
                                                            {bonusType && <span className="text-xs text-gray-500">({bonusType})</span>}
                                                        </div>
                                                    ) : formatCurrency(0)}
                                                </td>
                                                <td className="px-2 py-2 text-sm text-right font-semibold whitespace-nowrap">{formatCurrency(row.totalQtrEarnings)}</td>
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

export default MsrCalculator;
