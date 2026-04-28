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

/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

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
import { runBaselinePerformanceTests } from './run-performance-tests.mjs';
import { getBaselineReportPath, getCurrentReportPath } from './utils.mjs';

const isDebug = process.env.DEBUG_STORYBOOK_PERF_TEST === 'true';

if (isDebug) {
  console.log('🚨 -------> baseline report path:', getBaselineReportPath());

  console.log('🚨 -------> current report path:', getCurrentReportPath());
}

// Main execution
const main = async () => {
  console.log(
    '🚀 Starting storybook performance comparison with optimized builds to generate baseline...',
  );
  console.log(
    `📊 Running each test suite ${TEST_RUNS} times using static build`,
  );

  // baseline report path: tmp/lace-mobile-storybook/baseline/ctrf-report.json
  const baselineReportPath = getBaselineReportPath();

  // Ensure baseline directory exists
  const baselineDirectory = path.dirname(baselineReportPath);
  if (!fs.existsSync(baselineDirectory)) {
    fs.mkdirSync(baselineDirectory, { recursive: true });
  }

  const baselineExists = fs.existsSync(baselineReportPath);

  // Check if baseline report exists
  if (baselineExists) {
    // Delete existing baseline report
    fs.unlinkSync(baselineReportPath);
    console.log(`🗑️ Deleted existing baseline at '${baselineReportPath}'`);
  }

  let serverProcess;
  try {
    serverProcess = await runStaticStorybook(
      STORYBOOK_APP,
      STATIC_SERVER_BUILD_PATH,
    );

    const testUrl = `http://localhost:${TEST_PORT}`;

    // Run performance tests multiple times against the static build
    const baselineTestRuns = await runBaselinePerformanceTests({
      storybookAppName: STORYBOOK_APP,
      testUrl,
      testRuns: TEST_RUNS,
    });

    if (!baselineTestRuns) {
      console.error('❌ Failed to collect baseline test results');
      // ToDo: Return 1 when the performance comparison on CI has been tested fully
      return 0;
    }
    // Create baseline from baseline results
    console.log('\n📝 Creating baseline from baseline test results...');

    // Calculate median for baseline tests
    const baselineMedianTests = calculateMedianDurations(baselineTestRuns);
    console.log(
      `📊 Baseline median results: ${baselineMedianTests.length} tests`,
    );

    // Create baseline report with same structure as test reports
    const baselineReport = {
      results: {
        tests: baselineMedianTests.map(test => ({
          name: test.name,
          duration: test.duration,
          runsFound: test.runsFound,
          status: 'passed',
        })),
      },
    };

    fs.writeFileSync(
      baselineReportPath,
      JSON.stringify(baselineReport, null, 2),
    );

    console.log(
      `✅ Baseline created with ${baselineMedianTests.length} tests at '${baselineReportPath}'`,
    );
    console.log(
      '🎯 Run this script again to compare future performance against this baseline',
    );

    return 0; // Success exit code for baseline creation
  } catch (error) {
    console.error('❌ Baseline-generator script failed:', error);
    // ToDo: Return 1 when the performance comparison on CI has been tested fully
    return 0;
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
    console.error('❌ Baseline-generator script failed:', error);
    // ToDo: Return 1 when the performance comparison on CI has been tested fully
    process.exit(0);
  });
