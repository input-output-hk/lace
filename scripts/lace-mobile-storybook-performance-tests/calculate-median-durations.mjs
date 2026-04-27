/* eslint-disable no-console */

import { TEST_RUNS } from './const.mjs';

// Helper function to calculate median
export const calculateMedian = numbers => {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

// Helper function to calculate median durations for each test
export const calculateMedianDurations = (
  allTestRuns,
  testRunCount = TEST_RUNS,
) => {
  if (!allTestRuns || allTestRuns.length === 0) return [];

  // Collect all unique test names from all runs and debug inconsistencies
  const allTestNames = new Set();
  allTestRuns.forEach((run, runIndex) => {
    console.log(`📋 Run ${runIndex + 1}: ${run.length} tests`);
    run.forEach(test => allTestNames.add(test.name));
  });

  const medianTests = [];

  console.log(
    `🔍 Processing ${allTestNames.size} unique tests (requiring ALL ${testRunCount} runs per test)`,
  );

  // Debug: Check for inconsistencies between runs
  const missingTestsByRun = [];
  for (let runIndex = 0; runIndex < allTestRuns.length; runIndex++) {
    const runTestNames = new Set(allTestRuns[runIndex].map(test => test.name));
    const missingInThisRun = [...allTestNames].filter(
      name => !runTestNames.has(name),
    );
    if (missingInThisRun.length > 0) {
      console.warn(
        `⚠️  Run ${runIndex + 1} is missing ${
          missingInThisRun.length
        } tests that appeared in other runs`,
      );
      missingTestsByRun.push({
        run: runIndex + 1,
        missing: missingInThisRun.slice(0, 5),
      }); // Show first 5
    }
  }

  if (missingTestsByRun.length > 0) {
    console.warn(`🚨 INCONSISTENT TEST RUNS DETECTED:`);
    missingTestsByRun.forEach(({ run, missing }) => {
      console.warn(
        `   Run ${run} missing: ${missing.join(', ')}${
          missing.length === 5 ? '...' : ''
        }`,
      );
    });
  }

  for (const testName of allTestNames) {
    const durations = allTestRuns
      .map((run, runIndex) => {
        const test = run.find(test => test.name === testName);
        if (!test) {
          console.warn(
            `❌ Test "${testName}" missing from run ${runIndex + 1}`,
          );
        }
        return test?.duration;
      })
      .filter(duration => duration !== undefined);

    if (durations.length === TEST_RUNS) {
      medianTests.push({
        name: testName,
        duration: calculateMedian(durations),
        runsFound: durations.length,
      });
    } else {
      console.warn(
        `⚠️  Excluding test "${testName}" - only found in ${durations.length}/${TEST_RUNS} runs`,
      );
    }
  }

  return medianTests;
};
