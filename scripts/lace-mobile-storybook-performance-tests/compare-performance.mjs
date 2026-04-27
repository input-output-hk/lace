/* eslint-disable no-console */

/**
 * This script runs an optimized static build version of Storybook and takes performance timings from it,
 * recording only the time for the component under test to render, rather than the whole test setup
 * timings as well.
 *
 * To debug the script, set DEBUG_STORYBOOK_PERF_TEST='true'. This will cause the customized Storybook test-runner
 * to output its timings to apps/lace-mobile-storybook/test-runner.log, and the custom Storybook test reporter
 * to output the changes it's made to the final Jest report (apps/lace-mobile-storybook/ctrf/ctrf-report.json) at
 * apps/lace-mobile-storybook/ctrf/lace-mobile-storybook-performance-reporter.log
 */
import fs from 'node:fs';

import {
  cleanupBuildDirectory,
  runStaticStorybook,
  stopStaticServer,
} from './build-storybook-for-performance.mjs';
import { calculateMedianDurations } from './calculate-median-durations.mjs';
import {
  STATIC_SERVER_BUILD_PATH,
  STORYBOOK_APP,
  TEST_PORT,
  TEST_RUNS,
} from './const.mjs';
import { runCurrentPerformanceTests } from './run-performance-tests.mjs';
import { getBaselineReportPath, BASELINE_DIRECTORY } from './utils.mjs';

// Dynamic threshold calculation using exponential decay
export const calculateDynamicThreshold = baselineDuration => {
  if (baselineDuration < 10) return 8.0; // 800% for very fast tests (< 10ms)
  if (baselineDuration < 20) return 5.0; // 500% for fast tests (10-20ms)
  if (baselineDuration < 50) return 3.0; // 300% for medium-fast (20-50ms)
  if (baselineDuration < 100) return 2.5; // 250% for medium (50-100ms)
  if (baselineDuration < 200) return 2.0; // 200% for slow (100-200ms)
  if (baselineDuration < 500) return 1.5; // 150% for very slow (200-500ms)
  return 1.2; // 120% for extremely slow (> 500ms)
};

export const formatDurationDelta = (largerDuration, smallerDuration) => {
  if (largerDuration === smallerDuration) {
    return '0ms (0%)';
  }
  const deltaMs = largerDuration - smallerDuration;

  if (smallerDuration === 0) {
    return `${deltaMs}ms (∞)`;
  }

  const percentageDelta = ((largerDuration / smallerDuration) * 100).toFixed(0);
  return `${deltaMs}ms (${percentageDelta}%)`;
};

// Main execution
const main = async () => {
  console.log(
    '🚀 Starting storybook performance comparison with optimized builds...',
  );

  try {
    const baselineReportPath = getBaselineReportPath();
    const baselineExists = fs.existsSync(baselineReportPath);

    // Check if baseline report exists
    let baselineTests = [];
    if (baselineExists) {
      const baselineReport = JSON.parse(fs.readFileSync(baselineReportPath));
      baselineTests = baselineReport.results.tests;
      console.log(`📋 Using existing baseline at '${baselineReportPath}'`);
      console.log(`📋 Baseline has ${baselineTests.length} tests`);
    } else {
      console.log(
        `❌ Cannot compare performance as no baseline found at '${baselineReportPath}'. 
  -> Run "npm run storybook:mobile:perf-baseline" to generate a baseline.`,
      );
      // ToDo: Return 1 when the performance comparison on CI has been tested fully
      return 0;
    }
  } catch (error) {
    console.error('❌ Error parsing baseline report:', error);
    // ToDo: Return 1 when the performance comparison on CI has been tested fully
    return 0;
  }

  console.log(
    `📊 Running each test suite ${TEST_RUNS} times using static build`,
  );
  console.log('📈 Using dynamic thresholds based on test duration:');
  console.log('   • < 10ms: 800% threshold');
  console.log('   • 10-20ms: 500% threshold');
  console.log('   • 20-50ms: 300% threshold');
  console.log('   • 50-100ms: 250% threshold');
  console.log('   • 100-200ms: 200% threshold');
  console.log('   • 200-500ms: 150% threshold');
  console.log('   • > 500ms: 120% threshold');

  let serverProcess;
  try {
    serverProcess = await runStaticStorybook(
      STORYBOOK_APP,
      STATIC_SERVER_BUILD_PATH,
    );

    const testUrl = `http://localhost:${TEST_PORT}`;

    // Run performance tests multiple times against the static build
    const currentTestRuns = await runCurrentPerformanceTests({
      storybookAppName: STORYBOOK_APP,
      testUrl,
      testRuns: TEST_RUNS,
    });

    if (!currentTestRuns) {
      console.error('❌ Failed to collect current test results');
      // ToDo: Return 1 when the performance comparison on CI has been tested fully
      return 0;
    }

    // Calculate median for current tests
    const currentMedianTests = calculateMedianDurations(currentTestRuns);
    console.log(
      `📊 Current median results: ${currentMedianTests.length} tests`,
    );

    // Debug: Show which tests are in baseline vs current
    console.log(`📋 Baseline contains ${baselineTests.length} tests`);
    console.log(
      `📊 Current results contain ${currentMedianTests.length} tests`,
    );

    const baselineTestNames = new Set(baselineTests.map(t => t.name));
    const currentTestNames = new Set(currentMedianTests.map(t => t.name));
    const missingFromCurrent = [...baselineTestNames].filter(
      name => !currentTestNames.has(name),
    );
    const extraInCurrent = [...currentTestNames].filter(
      name => !baselineTestNames.has(name),
    );

    if (missingFromCurrent.length > 0) {
      console.log(
        `⚠️  ${missingFromCurrent.length} baseline tests missing from current results. If this is expected, run "npm run storybook:mobile:perf-baseline" to update the baseline.`,
      );
    }
    if (extraInCurrent.length > 0) {
      console.log(
        `➕ ${extraInCurrent.length} extra tests in current results not in baseline`,
      );
    }

    // Compare results
    let exitCode = 0;
    let passedTests = 0;
    let failedTests = 0;
    let improvedTests = 0;

    console.log('\n📈 Performance Comparison Results:');
    console.log('==========================================================');

    for (const baselineTest of baselineTests) {
      const currentTest = currentMedianTests.find(
        t => t.name === baselineTest.name,
      );
      if (!currentTest) {
        console.warn(
          `⚠️  [${baselineTest.name}] not found in current median results (excluded due to insufficient runs)`,
        );
        continue;
      }

      const dynamicThreshold = calculateDynamicThreshold(baselineTest.duration);
      const maxAllowedDuration = baselineTest.duration * dynamicThreshold;

      const largerDuration = Math.max(
        currentTest.duration,
        baselineTest.duration,
      );
      const smallerDuration = Math.min(
        currentTest.duration,
        baselineTest.duration,
      );

      const formattedDurationDelta = formatDurationDelta(
        largerDuration,
        smallerDuration,
      );

      if (currentTest.duration < baselineTest.duration) {
        console.log(
          `✅ [${baselineTest.name}] 🔥 duration reduced by ${formattedDurationDelta}`,
        );
        improvedTests++;
      } else if (currentTest.duration <= maxAllowedDuration) {
        console.log(
          `✅ [${
            baselineTest.name
          }] duration increased by ${formattedDurationDelta} (threshold: ${(
            dynamicThreshold * 100
          ).toFixed(0)}%)`,
        );
        passedTests++;
      } else {
        console.error(
          `❌ [${
            baselineTest.name
          }] duration increased by ${formattedDurationDelta}. Dynamic threshold is ${(
            dynamicThreshold * 100
          ).toFixed(0)}%. \r\ncurrentTest.duration: ${
            currentTest.duration
          }, \r\nbaselineTest.duration: ${
            baselineTest.duration
          }, \r\nmaxAllowedDuration: ${maxAllowedDuration}, \r\ndynamicThreshold: ${dynamicThreshold}`,
        );
        failedTests++;
        exitCode = 1;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`🔥 Improved: ${improvedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Total: ${passedTests + improvedTests + failedTests}`);

    if (failedTests > 0) {
      console.log(
        `\n⚠️  ${failedTests} tests exceeded their dynamic thresholds. If this is expected, run "npm run storybook:mobile:perf-baseline" to update the baseline.`,
      );
    } else {
      console.log('\n🎉 All performance tests passed!');
    }

    if (exitCode === 0) {
      const baselineReportPath = getBaselineReportPath();
      if (!fs.existsSync(BASELINE_DIRECTORY)) {
        fs.mkdirSync(BASELINE_DIRECTORY, { recursive: true });
      }
      const newBaseline = {
        results: {
          tests: currentMedianTests.map(test => ({
            name: test.name,
            duration: test.duration,
            runsFound: test.runsFound,
            status: 'passed',
          })),
        },
      };
      fs.writeFileSync(
        baselineReportPath,
        JSON.stringify(newBaseline, null, 2),
      );
      console.log(
        `📝 Saved current median as new baseline at '${baselineReportPath}'`,
      );
    }

    return exitCode;
  } catch (error) {
    console.error('❌ Error running performance comparison:', error);
    return 1;
  } finally {
    // Clean up: stop the static server
    stopStaticServer(serverProcess);

    // Optionally clean up build directory
    if (fs.existsSync(STATIC_SERVER_BUILD_PATH)) {
      console.log('🧹 Cleaning up build directory...');
      cleanupBuildDirectory(STORYBOOK_APP, STATIC_SERVER_BUILD_PATH);
    }
  }
};

main()
  .then(exitCode => {
    process.exit(exitCode || 0);
  })
  .catch(error => {
    console.error('❌ compare-performance script failed:', error);
    // ToDo: Return 1 when the performance comparison on CI has been tested fully
    process.exit(0);
  });
