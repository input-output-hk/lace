/* eslint-disable no-console */
import { execSync } from 'child_process';
import fs from 'fs';

import { MONOREPO_ROOT, TEST_RUNS } from './const.mjs';
import { getBaselineReportPath, getCurrentReportPath } from './utils.mjs';

const isDebug = process.env.DEBUG_STORYBOOK_PERF_TEST === 'true';

// Helper function to run performance tests against static build. NOTE: Expects Storybook to be running at testUrl
const runPerformanceTests = async ({
  storybookAppName,
  testUrl,
  testRuns = TEST_RUNS,
  reportPath,
}) => {
  if (!/^http:\/\/localhost:\d+$/.test(testUrl)) {
    throw new Error('Invalid test URL format');
  }

  console.log(
    `\n🔄 Running ${storybookAppName} performance tests ${testRuns} times...`,
  );

  const results = [];

  for (let runIndex = 0; runIndex < testRuns; runIndex++) {
    console.log(`  Run ${runIndex + 1}/${testRuns}...`);
    try {
      // Run test-storybook against the static build created in `buildStorybookForPerformance()`, above.
      // 🚨 IMPORTANT: This is where the performance tests are run. Note that this is NOT where Storybook is built.
      // Rather, this runs the Storybook *test-runner* add-on. The CLI options (--url, --no-cache, etc.) are
      // the *test-runner* package's options,NOT Storybook's.
      // See `buildStorybookForPerformance()` for the `storybook build` command and Storybook CLI options
      execSync(
        // Skip the NX cache, as it causes a race condition between Playwright and Storybook setup
        `npx nx test-storybook ${storybookAppName} --skip-nx-cache -- --url ${testUrl} --no-cache --maxWorkers=1 --stories-json`,
        {
          cwd: MONOREPO_ROOT,
          stdio: 'pipe',
          timeout: 600000, // 10 minutes timeout
          encoding: 'utf8',
          env: {
            ...process.env,
            STORYBOOK_PERF_TEST: 'true',
            DEBUG_STORYBOOK_PERF_TEST: process.env.DEBUG_STORYBOOK_PERF_TEST,
          },
        },
      );
      console.log(`    ✅ Run ${runIndex + 1} completed successfully`);
    } catch (error) {
      // Don't exit immediately on test failures - check if we got partial results
      console.warn(
        `⚠️  Run ${runIndex + 1} completed with exit code ${
          error.status
        } (may still have results): ${error.message}`,
      );
    }

    // Read the generated report
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath));
      const tests = report.results.tests;

      const passedTests = tests.filter(
        test => test.status === 'passed' && test.duration !== undefined,
      );
      const failedTests = tests.filter(test => test.status !== 'passed');

      console.log(
        `    Found ${passedTests.length} passed tests, ${failedTests.length} failed tests`,
      );

      // Debug: Show sample test durations
      if (isDebug && passedTests.length > 0) {
        const sampleTests = passedTests.slice(0, 3);
        console.log(
          `    Sample durations: ${sampleTests
            .map(t => `${t.name}: ${t.duration}ms`)
            .join(', ')}`,
        );
      }

      if (failedTests.length > 0) {
        console.log(
          `    Failed tests: ${failedTests
            .slice(0, 3)
            .map(t => t.name)
            .join(', ')}${failedTests.length > 3 ? '...' : ''}`,
        );
      }

      results.push(passedTests);
    } else {
      console.error(
        `❌ Report ${reportPath} not found after run ${runIndex + 1}`,
      );
      return null;
    }
  }

  return results;
};

export const runBaselinePerformanceTests = async ({
  storybookAppName,
  testUrl,
  testRuns = TEST_RUNS,
}) => {
  return runPerformanceTests({
    storybookAppName,
    testUrl,
    testRuns,
    reportPath: getBaselineReportPath(),
  });
};

export const runCurrentPerformanceTests = async ({
  storybookAppName,
  testUrl,
  testRuns = TEST_RUNS,
}) => {
  return runPerformanceTests({
    storybookAppName,
    testUrl,
    testRuns,
    reportPath: getCurrentReportPath(),
  });
};
