/**
 * An adversarial audit OF `network-binding-parity.test.ts`, not of the rule it
 * pins. The parity pin is the only mechanical guard that the three duplicated
 * network-binding walks stay in step; if it can be left green by a divergence
 * that changes what a product signs, it is theatre.
 *
 * Method: the pin's extraction and every one of its assertions are
 * re-implemented here over TEXT (`pinFailures`), then run against the three
 * real sources with ONE of them mutated in memory. A mutation that leaves
 * `pinFailures` empty is a divergence the pin cannot see. The real files are
 * never written.
 *
 * Two guards keep this file from being vacuously green: `pinFailures` must
 * report NOTHING for the unmutated three (fidelity), and must report something
 * for mutations the real pin does catch (kill signal).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');

const STACKS = ['module', 'shell', 'next'] as const;
type Stack = (typeof STACKS)[number];

const WALK_PATHS: Record<Stack, string> = {
  module: join(here, '..', 'src/common/store/utils/network-binding.ts'),
  shell: join(
    repoRoot,
    'apps/lace-extension-shell/src/surfaces/network-binding.ts',
  ),
  next: join(repoRoot, 'packages/next/core/src/domain/tx/networkBinding.ts'),
};

/** Copied verbatim from the pin under audit. */
const EXPECTED_FIELDS = [
  'body.certificates',
  'body.collateralReturn',
  'body.directDeposits',
  'body.networkId',
  'body.outputs',
  'body.proposalProcedures',
  'body.subTransactions',
  'body.withdrawals',
  'certificate.poolParameters',
  'governanceAction.withdrawals',
  'output.address',
  'proposal.rewardAccount',
  'sub.body',
  'withdrawal.rewardAccount',
  'withdrawal.stakeAddress',
].sort();

const stripComments = (source: string): string =>
  source.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');

const blockSource = (source: string, name: string): string => {
  const start = source.indexOf(`const ${name}`);
  const end = source.indexOf('\n};', start);
  if (start === -1 || end === -1)
    throw new Error(`no \`const ${name}\` … \`\\n};\` block`);
  return stripComments(source.slice(start, end));
};

const fieldsRead = (source: string): string[] => [
  ...new Set(
    [
      ...blockSource(source, 'networkEvidence').matchAll(
        /\b(body|output|proposal|withdrawal|certificate|governanceAction|sub)\.([a-zA-Z]+)/g,
      ),
    ].map(([, receiver, property]) => `${receiver}.${property}`),
  ),
];

/**
 * Every assertion the pin makes, as the list of failures it would report.
 * Empty means the pin stays GREEN on these three sources.
 */
const pinFailures = (sources: Record<Stack, string>): string[] => {
  const failures: string[] = [];
  const addressBodies: string[] = [];

  for (const stack of STACKS) {
    const source = sources[stack];

    try {
      const fields = fieldsRead(source).sort();
      // Canary + pinned field set.
      if (fields.length <= 5) failures.push(`${stack}: extracted nothing`);
      if (fields.join('|') !== EXPECTED_FIELDS.join('|'))
        failures.push(`${stack}: field set drifted`);
    } catch (error) {
      failures.push(`${stack}: ${(error as Error).message}`);
    }

    // Both halves of the rule, reported as distinct causes — read from the
    // refusal BLOCK, because statedNetworkLabel carries the same literals and
    // a whole-file grep cannot tell which copy changed.
    try {
      const code = blockSource(source, 'networkBindingRefusal');
      if (!code.includes('evidence.length === 0'))
        failures.push(`${stack}: lost the non-empty half`);
      if (!/evidence\.every\(\s*stated => stated === networkId\s*\)/.test(code))
        failures.push(`${stack}: lost the unanimity half`);
      if (!/stated !== 'unreadable' && stated !== networkId/.test(code))
        failures.push(`${stack}: lost the conflict arm's negation`);
      for (const cause of [
        'states-no-network',
        'states-other-network',
        'states-unreadable-element',
      ])
        if (!code.includes(`'${cause}'`))
          failures.push(`${stack}: lost the ${cause} cause`);
    } catch (error) {
      failures.push(`${stack}: ${(error as Error).message}`);
    }

    // The undecodable-address classification.
    try {
      const body = blockSource(source, 'evidenceOfAddress')
        .replaceAll(/\s+/g, ' ')
        .trim();
      if (!body.includes("'unreadable'"))
        failures.push(`${stack}: stopped answering 'unreadable'`);
      if (!body.includes("networkId ?? 'unreadable'"))
        failures.push(`${stack}: stopped testing for an undecodable address`);
      addressBodies.push(body.replaceAll('Number(networkId)', 'networkId'));
    } catch (error) {
      failures.push(`${stack}: ${(error as Error).message}`);
    }
  }

  if (new Set(addressBodies).size !== 1)
    failures.push('the three evidenceOfAddress differ beyond Number()');

  // The walk bodies themselves, compared CHARACTER-for-character modulo the
  // licensed `Number()` widening. This is what turns the pin from a naming
  // guard into a rule guard: the three are supposed to BE the same rule, so
  // any single-stack change to how a field is treated is drift by definition.
  for (const name of [
    'evidenceOfAddress',
    'networkEvidence',
    'spentOutpoints',
    'everyInputIsOwn',
    'integerMapKey',
    'mapEntriesDuplicateKeys',
    'mapStatesDuplicateKeys',
    'bodyStatesDuplicateKeys',
    'networkBindingRefusal',
    'statedNetworkLabel',
  ]) {
    const bodies = new Set(
      STACKS.map(stack => {
        try {
          return blockSource(sources[stack], name)
            .replaceAll('Number(networkId)', 'networkId')
            .replaceAll('Number(body.networkId)', 'body.networkId')
            .replaceAll('networkId: number', 'networkId: Cardano.NetworkId')
            .replaceAll(
              'disagreeing.includes(1)',
              'disagreeing.includes(Cardano.NetworkId.Mainnet)',
            )
            .replaceAll(/\s+/g, ' ')
            .trim();
        } catch {
          return `UNREADABLE:${stack}`;
        }
      }),
    );
    if (bodies.size !== 1) failures.push(`the three \`${name}\` have drifted`);
  }

  return failures;
};

const REAL: Record<Stack, string> = {
  module: readFileSync(WALK_PATHS.module, 'utf8'),
  shell: readFileSync(WALK_PATHS.shell, 'utf8'),
  next: readFileSync(WALK_PATHS.next, 'utf8'),
};

/** Textual surgery that refuses to silently no-op — a mutation that did not
 * apply would fake a green and invert every finding below. */
const replaceOnce = (
  source: string,
  needle: string,
  replacement: string,
): string => {
  const at = source.indexOf(needle);
  if (at === -1) throw new Error(`mutation target not found:\n${needle}`);
  if (source.indexOf(needle, at + needle.length) !== -1)
    throw new Error(`mutation target is ambiguous:\n${needle}`);
  return source.slice(0, at) + replacement + source.slice(at + needle.length);
};

const mutated = (stack: Stack, source: string): Record<Stack, string> => ({
  ...REAL,
  [stack]: source,
});

const patch = (
  stack: Stack,
  needle: string,
  replacement: string,
): Record<Stack, string> =>
  mutated(stack, replaceOnce(REAL[stack], needle, replacement));

describe('the parity pin is honest about what it can see', () => {
  it('reports nothing for the three real sources (fidelity of this harness)', () => {
    expect(pinFailures(REAL)).toEqual([]);
  });

  it('KILL SIGNAL: it does report a walk that drops the outputs loop', () => {
    expect(
      pinFailures(
        patch(
          'module',
          '  for (const output of body.outputs)\n' +
            '    evidence.push(evidenceOfAddress(output.address));\n',
          '',
        ),
      ),
    ).not.toEqual([]);
  });

  it('KILL SIGNAL: it does report a walk renamed out of its reach', () => {
    expect(
      pinFailures(
        patch(
          'module',
          'const networkEvidence = (',
          'const collectEvidence = (',
        ),
      ),
    ).not.toEqual([]);
  });
});

// Each case is a divergence that changes what a product signs, so the pin
// must report every one. It can because the three walks are meant to BE the
// same rule: the pin diffs the walk bodies CHARACTER-for-character (modulo
// one declared widening), which makes any single-stack change drift by
// definition.
//
// What no text pin can catch is the same change made to all three at once.
// That is not drift, and judging it needs behaviour.
describe('divergences the parity pin now catches', () => {
  it('G1: a networkId fallback that fabricates evidence is caught', () => {
    // `?? Testnet` reads as tidying away an optional. It deletes the
    // "at least one element must speak" half at the source: a bare
    // inputs+fee+signer body now yields [0] and is SIGNED on any testnet.
    const failures = pinFailures(
      patch(
        'module',
        'if (body.networkId !== undefined) evidence.push(body.networkId);',
        'evidence.push(body.networkId ?? Cardano.NetworkId.Testnet);',
      ),
    );
    expect(failures).not.toEqual([]);
  });

  it('G2: a walk that stops calling evidenceOfAddress is caught', () => {
    // The pin proves `evidenceOfAddress` is present and byte-identical in all
    // three. It never proves the walk still USES it.
    const source =
      replaceOnce(
        REAL.module,
        'evidence.push(evidenceOfAddress(output.address));',
        'evidence.push(tolerantEvidence(output.address));',
      ) +
      '\nconst tolerantEvidence = (address: string): NetworkEvidence =>\n' +
      '  Cardano.Address.fromString(address)?.getNetworkId() ?? 0;\n';
    expect(pinFailures(mutated('module', source))).not.toEqual([]);
  });

  it('G3: an inverted unanimity half is caught', () => {
    // /evidence\.every\(\s*stated => stated === networkId\s*\)/ matches with or
    // without the leading `!`. Dropped, the stack signs exactly the
    // cross-network bodies it exists to refuse.
    expect(
      pinFailures(
        patch(
          'module',
          'if (evidence.every(stated => stated === networkId)) return null;',
          'if (!evidence.every(stated => stated === networkId)) return null;',
        ),
      ),
    ).not.toEqual([]);
  });

  it('G4: swapping the two causes is caught', () => {
    expect(
      pinFailures(
        patch(
          'module',
          '  if (evidence.length === 0)\n' +
            '    return everyInputIsOwn(body, ownUtxoReferences)\n' +
            '      ? null\n' +
            "      : 'states-no-network';\n" +
            '  if (evidence.every(stated => stated === networkId)) return null;\n' +
            "  if (evidence.some(stated => stated !== 'unreadable' && stated !== networkId))\n" +
            "    return 'states-other-network';",
          '  if (evidence.length === 0)\n' +
            '    return everyInputIsOwn(body, ownUtxoReferences)\n' +
            '      ? null\n' +
            "      : 'states-other-network';\n" +
            '  if (evidence.every(stated => stated === networkId)) return null;\n' +
            "  if (evidence.some(stated => stated !== 'unreadable' && stated !== networkId))\n" +
            "    return 'states-no-network';",
        ),
      ),
    ).not.toEqual([]);
  });

  it('G5: an element skipped by a filter on an already-read field is caught', () => {
    // Same field set, fewer pushes: every output whose address does not start
    // with `addr` — including the undecodable ones the rule calls
    // 'unreadable' — stops being evidence.
    expect(
      pinFailures(
        patch(
          'module',
          '  for (const output of body.outputs)\n' +
            '    evidence.push(evidenceOfAddress(output.address));',
          '  for (const output of body.outputs)\n' +
            "    if (output.address.startsWith('addr'))\n" +
            '      evidence.push(evidenceOfAddress(output.address));',
        ),
      ),
    ).not.toEqual([]);
  });

  it('G6: a re-pointed discriminant is caught', () => {
    // `([a-zA-Z]+)` cannot match a property beginning with `_`, so every
    // `__typename` test is structurally outside the pinned set — and those
    // tests are precisely what selects the elements the walk reads.
    const fields = fieldsRead(REAL.module);
    expect(fields).not.toContain('certificate.__typename');
    expect(fields).not.toContain('governanceAction.__typename');

    // Re-point the governance discriminant and the treasury-withdrawal
    // recipients — the accounts that actually get PAID — go unread.
    expect(
      pinFailures(
        patch(
          'module',
          'Cardano.GovernanceActionType.treasury_withdrawals_action',
          'Cardano.GovernanceActionType.info_action',
        ),
      ),
    ).not.toEqual([]);
  });

  it('G7: halves left alive only in dead code are caught', () => {
    // `codeOf` is the entire file, so a gutted live function passes as long as
    // some leftover text still spells the two halves out.
    const live =
      '  const evidence = networkEvidence(body);\n' +
      '  if (evidence.length === 0)\n' +
      '    return everyInputIsOwn(body, ownUtxoReferences)\n' +
      '      ? null\n' +
      "      : 'states-no-network';\n" +
      '  if (evidence.every(stated => stated === networkId)) return null;\n' +
      "  if (evidence.some(stated => stated !== 'unreadable' && stated !== networkId))\n" +
      "    return 'states-other-network';\n" +
      "  return 'states-unreadable-element';";
    const source =
      replaceOnce(REAL.module, live, '  return null;') +
      '\nconst legacyRefusal = (\n' +
      '  evidence: NetworkEvidence[],\n' +
      '  networkId: Cardano.NetworkId,\n' +
      '): NetworkBindingRefusal | null => {\n' +
      live.replace('  const evidence = networkEvidence(body);\n', '') +
      '\n};\n';
    expect(pinFailures(mutated('module', source))).not.toEqual([]);
  });

  it('G8: a prefix-matching sibling can no longer shadow the live walk', () => {
    // Rename the real walk to `networkEvidenceOfBody` and make `networkEvidence`
    // a wrapper. `indexOf('const networkEvidence')` still lands on the renamed
    // helper — the pin reads a function the product no longer calls directly.
    const source =
      replaceOnce(
        replaceOnce(
          REAL.module,
          'const networkEvidence = (',
          'const networkEvidenceOfBody = (',
        ),
        'evidence.push(...networkEvidence(sub.body));',
        'evidence.push(...networkEvidenceOfBody(sub.body));',
      ) +
      '\nconst networkEvidence = (\n' +
      '  body: Cardano.TxBody,\n' +
      '): NetworkEvidence[] => [\n' +
      '  ...networkEvidenceOfBody(body),\n' +
      '  Cardano.NetworkId.Testnet,\n' +
      '];\n';

    expect(pinFailures(mutated('module', source))).not.toEqual([]);
    // Proof the pin read the shadow, not the live entry point.
    expect(blockSource(source, 'networkEvidence')).toContain(
      'for (const output of body.outputs)',
    );
    expect(blockSource(source, 'networkEvidence')).not.toContain(
      'Cardano.NetworkId.Testnet',
    );
  });
});
