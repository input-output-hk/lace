// The property tests' budget, as the jest setup file set it: a run is
// interrupted and failed at 70% of the test timeout.
import fc from 'fast-check';

const testTimeout = 12_000;
fc.configureGlobal({
  interruptAfterTimeLimit: testTimeout * 0.7,
  markInterruptAsFailure: true,
  numRuns: testTimeout / 50,
});
