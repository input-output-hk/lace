import { makeProviders } from '../cardano/queries';
import { returnFunds } from '../cardano/tx';

import { runMigrationFlow } from './flow/driver';
import { selectNetwork } from './networks';
import { accountForRole } from './roles';
import { selectScenario } from './scenarios';
import { drainHigherAccounts } from './setup';

import type { NetworkName } from './networks';

// Usage: `npm run sweep -- <network> <scenario>`
const NETWORK = process.argv[2] as NetworkName;
const SCENARIO = process.argv[3];

const main = async () => {
  const network = selectNetwork(NETWORK);
  const providers = makeProviders(network.config);
  const scenario = selectScenario(SCENARIO);

  const [treasury, source, destination] = await Promise.all([
    accountForRole('treasury', network.chain),
    accountForRole(scenario.sourceRole ?? 'source', network.chain),
    accountForRole('dest', network.chain),
  ]);
  const context = { providers, source, destination, treasury, network };

  console.log(`=== SCENARIO: ${scenario.name} — ${scenario.description} ===`);

  console.log('=== PHASE 0: RECOVER (residual dest -> treasury) ===');
  const recovered = await returnFunds(providers, {
    from: destination,
    to: treasury.address,
  });
  console.log(
    recovered ? `  recovered dest funds: ${recovered}` : '  dest already empty',
  );
  // Restore the single-account invariant the live scan enforces, so a source a
  // prior multiple-active-accounts run parked funds on does not make every other
  // scenario refuse. The multiple-active-accounts scenario re-funds account 1 in
  // its own stage.
  console.log('  draining any source account beyond index 0');
  await drainHigherAccounts(providers, { source, treasury });

  const results = await scenario.run(context, async () =>
    runMigrationFlow({ source, destination, providers }),
  );
  for (const { label, didPass } of results) {
    console.log(`  ${didPass ? 'PASS' : 'FAIL'} ${label}`);
  }
  const hasFailure = results.some(result => !result.didPass);

  console.log('=== PHASE 4: CLEANUP (dest -> treasury) ===');
  const cleaned = await returnFunds(providers, {
    from: destination,
    to: treasury.address,
  });
  console.log(
    cleaned ? `  returned to treasury: ${cleaned}` : '  nothing to clean up',
  );

  if (hasFailure) {
    console.error('ASSERTIONS FAILED');
    process.exit(1);
  }
  console.log(
    `PASS: scenario "${scenario.name}" verified end to end on ${network.name}`,
  );
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
