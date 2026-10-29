/**
 * The contrarian half of network-binding-parity.test.ts.
 *
 * That test pins three deliberately-duplicated copies of the network-binding
 * rule by reading them as TEXT. Text pins have a second failure mode besides
 * missing a divergence: going red for a change that is not one. A guard that
 * fails a rename gets weakened or deleted by the next person in a hurry, and
 * then the duplication it was pinning drifts unwatched — which is the exact
 * accident that produced these three copies' first divergence.
 *
 * So this file attacks the pin from the FALSE-POSITIVE side. Each case takes
 * the REAL walk source, applies a refactor that changes no behaviour, runs the
 * parity test's own extraction over the transformed copy, and asserts the pin
 * would go red. Behaviour-invariance is not asserted by hand: both copies are
 * transpiled and executed over the same bodies, and their evidence arrays must
 * match.
 *
 * Nothing here writes to a source file. The walks are read, copied into
 * strings, and transformed in memory.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Cardano, Serialization } from '@cardano-sdk/core';
import { transformSync } from 'esbuild';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');

const WALK_PATHS = {
  'dapp-connector module': join(
    here,
    '..',
    'src/common/store/utils/network-binding.ts',
  ),
  'extension shell': join(
    repoRoot,
    'apps/lace-extension-shell/src/surfaces/network-binding.ts',
  ),
  'lace-next': join(
    repoRoot,
    'packages/next/core/src/domain/tx/networkBinding.ts',
  ),
} as const;

const SOURCES = Object.fromEntries(
  Object.entries(WALK_PATHS).map(([stack, path]) => [
    stack,
    readFileSync(path, 'utf8'),
  ]),
) as Record<keyof typeof WALK_PATHS, string>;

const MODULE_WALK = SOURCES['dapp-connector module'];

/* ------------------------------------------------------------------ *
 * The parity test's extraction, re-implemented over TEXT rather than
 * a path. Kept deliberately identical in behaviour so a red here means
 * a red there; it is copied rather than imported because the parity
 * test exports nothing.
 * ------------------------------------------------------------------ */

const stripComments = (source: string): string =>
  source.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');

const blockSource = (source: string, name: string): string => {
  const start = source.indexOf(`const ${name}`);
  const end = source.indexOf('\n};', start);
  if (start === -1 || end === -1)
    throw new Error(`no \`const ${name}\` … \`\\n};\` block`);
  return stripComments(source.slice(start, end));
};

const fieldsRead = (source: string): string[] =>
  [
    ...new Set(
      [
        ...blockSource(source, 'networkEvidence').matchAll(
          /\b(body|output|proposal|withdrawal|certificate|governanceAction|sub)\.([a-zA-Z]+)/g,
        ),
      ].map(([, receiver, property]) => `${receiver}.${property}`),
    ),
  ].sort();

const keepsBothHalves = (source: string): boolean => {
  const code = stripComments(source);
  return (
    code.includes('evidence.length === 0') &&
    /evidence\.every\(\s*stated => stated === networkId\s*\)/.test(code)
  );
};

const addressBlock = (source: string): string =>
  blockSource(source, 'evidenceOfAddress').replaceAll(/\s+/g, ' ').trim();

const addressBlocksAgree = (sources: string[]): boolean =>
  new Set(
    sources.map(source =>
      addressBlock(source).replaceAll('Number(networkId)', 'networkId'),
    ),
  ).size === 1;

/* ------------------------------------------------------------------ *
 * Running a walk. A refactor "changes no behaviour" only if both
 * copies actually produce the same evidence, so both are transpiled
 * and executed rather than eyeballed.
 * ------------------------------------------------------------------ */

type Walk = (body: unknown) => unknown[];

const compileWalk = (source: string): Walk => {
  const standalone = source
    .replaceAll(/^import .*$/gm, '')
    .replaceAll(/^export /gm, '');
  const js = transformSync(standalone, { loader: 'ts' }).code;
  // The point of this file is to RUN a refactored copy of the walk, which
  // exists only as a string. Nothing user-supplied reaches here: the input is
  // a repo source file this test transformed itself.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const make = new Function(
    'Cardano',
    'Serialization',
    `${js}\nreturn networkEvidence;`,
  ) as (cardano: unknown, serialization: unknown) => Walk;
  return make(Cardano, Serialization);
};

const PAYMENT_A =
  'addr_test1qp6l79jg5ahsrkfyrprs9eaaek0g0tfg3m4tln0vkmq29m8gnpz7wtsycpytk4tn3fe85fqhw7enll66ud9ex6yeu4wqtc5sdg';
const PAYMENT_B =
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle';
const PAYMENT_C =
  'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7';
const REWARD_A =
  'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d';
const REWARD_B =
  'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx';
const REWARD_C =
  'stake_test1uqcug6xuc6mqhpguan9rrae4l7yyrucnxql5h95jzgxtgxsf8qd5r';
const REWARD_D =
  'stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn';
const REWARD_E =
  'stake_test17rphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcljw6kf';

/** Every arm of the walk, so a dropped branch shows up as a shorter array. */
const FIXTURE_BODIES: unknown[] = [
  { outputs: [] },
  { networkId: 1, outputs: [{ address: PAYMENT_A }] },
  {
    outputs: [{ address: PAYMENT_A }, { address: PAYMENT_B }],
    collateralReturn: { address: PAYMENT_C },
    withdrawals: [{ stakeAddress: REWARD_A }],
    directDeposits: [{ stakeAddress: REWARD_B }],
  },
  {
    outputs: [],
    proposalProcedures: [
      {
        rewardAccount: REWARD_A,
        governanceAction: {
          __typename: Cardano.GovernanceActionType.treasury_withdrawals_action,
          withdrawals: [
            { rewardAccount: REWARD_B },
            { rewardAccount: REWARD_C },
          ],
        },
      },
      {
        rewardAccount: REWARD_D,
        governanceAction: {
          __typename: Cardano.GovernanceActionType.info_action,
        },
      },
    ],
  },
  {
    outputs: [],
    certificates: [
      { __typename: Cardano.CertificateType.StakeDelegation },
      {
        __typename: Cardano.CertificateType.PoolRegistration,
        poolParameters: {
          rewardAccount: REWARD_A,
          owners: [REWARD_B, REWARD_E],
        },
      },
    ],
  },
  {
    outputs: [{ address: PAYMENT_A }],
    subTransactions: [
      { body: { outputs: [{ address: PAYMENT_B }], withdrawals: [] } },
      { body: { outputs: [], networkId: 0 } },
    ],
  },
  { outputs: [{ address: 'not-an-address' }] },
];

const evidenceOverFixtures = (walk: Walk): unknown[][] =>
  FIXTURE_BODIES.map(body => walk(body));

/**
 * The assertion every case below shares: the refactor produces the same
 * evidence for every fixture body, and the pin still notices.
 */
const behaviourIsUnchangedBy = (refactored: string): void => {
  expect(
    evidenceOverFixtures(compileWalk(refactored)),
    'the refactor changed what the walk collects — it is not a false positive',
  ).toEqual(evidenceOverFixtures(compileWalk(MODULE_WALK)));
};

/* ------------------------------------------------------------------ *
 * Baseline
 * ------------------------------------------------------------------ */

const BASELINE_FIELDS = fieldsRead(MODULE_WALK);

describe('the parity pin is red for refactors that change no behaviour', () => {
  it('the harness reproduces the pin (canary)', () => {
    expect(BASELINE_FIELDS).toContain('output.address');
    expect(BASELINE_FIELDS.length).toBeGreaterThan(5);
    expect(keepsBothHalves(MODULE_WALK)).toBe(true);
    expect(addressBlocksAgree(Object.values(SOURCES))).toBe(true);
    // The compiled copy really runs: the last fixture's garbage address must
    // classify, not throw.
    expect(evidenceOverFixtures(compileWalk(MODULE_WALK)).at(-1)).toEqual([
      'unreadable',
    ]);
  });

  it('renaming the output loop variable', () => {
    const refactored = MODULE_WALK.replaceAll(/\boutput\b/g, 'txOut');
    behaviourIsUnchangedBy(refactored);
    expect(fieldsRead(refactored)).not.toEqual(BASELINE_FIELDS);
    expect(fieldsRead(refactored)).not.toContain('output.address');
  });

  it('renaming the sub-transaction loop variable', () => {
    const refactored = MODULE_WALK.replaceAll(
      'for (const sub of body.subTransactions ?? [])\n      evidence.push(...networkEvidence(sub.body));',
      'for (const child of body.subTransactions ?? [])\n      evidence.push(...networkEvidence(child.body));',
    );
    expect(refactored, 'the anchor text moved').not.toEqual(MODULE_WALK);
    behaviourIsUnchangedBy(refactored);
    expect(fieldsRead(refactored)).not.toContain('sub.body');
  });

  it('destructuring the body once at the top', () => {
    const refactored = MODULE_WALK.replace(
      'const evidence: NetworkEvidence[] = [];',
      `const evidence: NetworkEvidence[] = [];
  const { certificates, networkId, outputs, proposalProcedures, withdrawals, directDeposits } =
    body as Cardano.TxBody;`,
    )
      .replace(
        'if (body.networkId !== undefined)',
        'if (networkId !== undefined)',
      )
      .replace('evidence.push(body.networkId);', 'evidence.push(networkId);')
      .replace(
        'for (const output of body.outputs)',
        'for (const output of outputs)',
      )
      .replace('...(body.withdrawals ?? []),', '...(withdrawals ?? []),')
      .replace('...(body.directDeposits ?? []),', '...(directDeposits ?? []),')
      .replace(
        'for (const proposal of body.proposalProcedures ?? [])',
        'for (const proposal of proposalProcedures ?? [])',
      )
      .replace(
        'for (const certificate of body.certificates ?? [])',
        'for (const certificate of certificates ?? [])',
      );
    behaviourIsUnchangedBy(refactored);
    const fields = fieldsRead(refactored);
    for (const gone of [
      'body.certificates',
      'body.networkId',
      'body.outputs',
      'body.proposalProcedures',
      'body.withdrawals',
      'body.directDeposits',
    ])
      expect(fields, `${gone} vanished from the pin`).not.toContain(gone);
  });

  it('hoisting the certificate loop into a named helper', () => {
    const loop = `  for (const certificate of body.certificates ?? []) {
    if (certificate.__typename !== Cardano.CertificateType.PoolRegistration)
      continue;
    const { owners, rewardAccount } = certificate.poolParameters;
    evidence.push(evidenceOfAddress(rewardAccount));
    // Owners cannot disagree with the pool reward account, and are walked
    // anyway so the loop need not be re-added if that changes: on the wire an
    // owner is a bare key hash, and PoolParams.toCore synthesises each owner
    // reward account using the POOL reward account network id. Not a second,
    // independent source of evidence.
    evidence.push(...owners.map(evidenceOfAddress));
  }
`;
    expect(MODULE_WALK, 'the certificate loop moved').toContain(loop);
    const helper = `const certificateEvidence = (
  certificates: Cardano.Certificate[],
): NetworkEvidence[] => {
  const evidence: NetworkEvidence[] = [];
  for (const certificate of certificates) {
    if (certificate.__typename !== Cardano.CertificateType.PoolRegistration)
      continue;
    const { owners, rewardAccount } = certificate.poolParameters;
    evidence.push(evidenceOfAddress(rewardAccount));
    // Owners cannot disagree with the pool reward account, and are walked
    // anyway so the loop need not be re-added if that changes: on the wire an
    // owner is a bare key hash, and PoolParams.toCore synthesises each owner
    // reward account using the POOL reward account network id. Not a second,
    // independent source of evidence.
    evidence.push(...owners.map(evidenceOfAddress));
  }
  return evidence;
};

`;
    const refactored = MODULE_WALK.replace(
      loop,
      '  evidence.push(...certificateEvidence(body.certificates ?? []));\n',
    ).replace(
      'const networkEvidence = (',
      `${helper}const networkEvidence = (`,
    );
    behaviourIsUnchangedBy(refactored);
    expect(fieldsRead(refactored)).not.toContain('certificate.poolParameters');
  });

  it("prettier's default arrowParens, or renaming the unanimity callback", () => {
    const parenthesised = MODULE_WALK.replaceAll(
      'evidence.every(stated => stated === networkId)',
      'evidence.every((stated) => stated === networkId)',
    );
    const renamed = MODULE_WALK.replaceAll(
      'evidence.every(stated => stated === networkId)',
      'evidence.every(claimed => claimed === networkId)',
    );
    for (const variant of [parenthesised, renamed])
      expect(variant, 'the anchor text moved').not.toEqual(MODULE_WALK);
    // Both are alpha-renames / optional syntax: the walk itself is untouched.
    behaviourIsUnchangedBy(parenthesised);
    behaviourIsUnchangedBy(renamed);
    expect(keepsBothHalves(parenthesised)).toBe(false);
    expect(keepsBothHalves(renamed)).toBe(false);
  });

  it('renaming the evidence array', () => {
    const refactored = MODULE_WALK.replaceAll(
      /\bevidence\b/g,
      'stated',
    ).replaceAll(
      'stated.every(stated => stated === networkId)',
      'stated.every(one => one === networkId)',
    );
    behaviourIsUnchangedBy(refactored);
    expect(keepsBothHalves(refactored)).toBe(false);
  });

  it('an early-return spelling of evidenceOfAddress in one stack only', () => {
    const refactored = MODULE_WALK.replace(
      "  return networkId ?? 'unreadable';",
      "  if (networkId === undefined) return 'unreadable';\n  return networkId;",
    );
    expect(refactored, 'the anchor text moved').not.toEqual(MODULE_WALK);
    behaviourIsUnchangedBy(refactored);
    // The equivalent early-return guard still handles unreadable addresses.
    expect(addressBlock(refactored)).toContain("'unreadable'");
    expect(addressBlock(refactored)).toContain('networkId === undefined');
    // … yet the character-for-character comparison across stacks fails.
    expect(
      addressBlocksAgree([
        refactored,
        SOURCES['extension shell'],
        SOURCES['lace-next'],
      ]),
    ).toBe(false);
  });

  it('collapsing evidenceOfAddress to a single expression breaks the extractor itself', () => {
    const refactored = MODULE_WALK.replace(
      `const evidenceOfAddress = (address: string): NetworkEvidence => {
  const networkId = Cardano.Address.fromString(address)?.getNetworkId();
  return networkId ?? 'unreadable';
};`,
      `const evidenceOfAddress = (address: string): NetworkEvidence =>
  Cardano.Address.fromString(address)?.getNetworkId() ?? 'unreadable';`,
    );
    expect(refactored, 'the anchor text moved').not.toEqual(MODULE_WALK);
    behaviourIsUnchangedBy(refactored);
    // `blockSource` ends at the first `\n};`, which no longer belongs to
    // evidenceOfAddress: the "address block" silently swallows the whole walk.
    const block = addressBlock(refactored);
    expect(block.length).toBeGreaterThan(addressBlock(MODULE_WALK).length * 5);
    expect(block).toContain('body.outputs');
    // And the failure it reports names the wrong thing: the stack still tests
    // for an undecodable address, but the assertion that says so is gone.
    expect(block).not.toContain("networkId ?? 'unreadable'");
  });

  it('a doc comment that names the function shifts the slice', () => {
    const refactored = MODULE_WALK.replace(
      'const evidenceOfAddress = (address: string)',
      `/** Sibling of \`const evidenceOfAddress\` in the other two stacks. */
const evidenceOfAddress = (address: string)`,
    );
    expect(refactored, 'the anchor text moved').not.toEqual(MODULE_WALK);
    behaviourIsUnchangedBy(refactored);
    // `blockSource` searches the RAW text, so it locks onto the mention inside
    // the comment; stripComments then cannot see an opening `/*` and the prose
    // leaks into the compared block.
    expect(addressBlock(refactored)).toContain('in the other two stacks. */');
    expect(
      addressBlocksAgree([
        refactored,
        SOURCES['extension shell'],
        SOURCES['lace-next'],
      ]),
    ).toBe(false);
  });
});

describe('refactors the pin correctly tolerates', () => {
  it('for…of rewritten as forEach', () => {
    const refactored = MODULE_WALK.replace(
      `  for (const certificate of body.certificates ?? []) {
    if (certificate.__typename !== Cardano.CertificateType.PoolRegistration)
      continue;
    const { owners, rewardAccount } = certificate.poolParameters;
    evidence.push(evidenceOfAddress(rewardAccount));
    // Owners cannot disagree with the pool reward account, and are walked
    // anyway so the loop need not be re-added if that changes: on the wire an
    // owner is a bare key hash, and PoolParams.toCore synthesises each owner
    // reward account using the POOL reward account network id. Not a second,
    // independent source of evidence.
    evidence.push(...owners.map(evidenceOfAddress));
  }`,
      `  (body.certificates ?? []).forEach(certificate => {
    if (certificate.__typename !== Cardano.CertificateType.PoolRegistration)
      return;
    const { owners, rewardAccount } = certificate.poolParameters;
    evidence.push(evidenceOfAddress(rewardAccount));
    // Owners cannot disagree with the pool reward account, and are walked
    // anyway so the loop need not be re-added if that changes: on the wire an
    // owner is a bare key hash, and PoolParams.toCore synthesises each owner
    // reward account using the POOL reward account network id. Not a second,
    // independent source of evidence.
    evidence.push(...owners.map(evidenceOfAddress));
  });`,
    );
    expect(refactored, 'the anchor text moved').not.toEqual(MODULE_WALK);
    behaviourIsUnchangedBy(refactored);
    expect(fieldsRead(refactored)).toEqual(BASELINE_FIELDS);
  });

  it('prettier reflowing the address helper onto different lines', () => {
    const refactored = MODULE_WALK.replace(
      '  const networkId = Cardano.Address.fromString(address)?.getNetworkId();',
      '  const networkId =\n    Cardano.Address.fromString(address)?.getNetworkId();',
    );
    expect(refactored, 'the anchor text moved').not.toEqual(MODULE_WALK);
    behaviourIsUnchangedBy(refactored);
    expect(
      addressBlocksAgree([
        refactored,
        SOURCES['extension shell'],
        SOURCES['lace-next'],
      ]),
      'whitespace is normalised before the comparison, so reflow is free',
    ).toBe(true);
  });

  it('all three stacks are formatted by one prettier config', () => {
    // A per-package .prettierrc would make a formatting difference between the
    // stacks unavoidable, and the character comparison unfixable. There is
    // exactly one config at the workspace root, so that risk is not real.
    const overrides = [
      join(here, '..', '.prettierrc'),
      join(repoRoot, 'apps/lace-extension-shell/.prettierrc'),
      join(repoRoot, 'packages/next/core/.prettierrc'),
      join(repoRoot, 'packages/next/.prettierrc'),
    ].filter(path => {
      try {
        readFileSync(path, 'utf8');
        return true;
      } catch {
        return false;
      }
    });
    expect(overrides, 'a package-local prettier config appeared').toEqual([]);
    expect(readFileSync(join(repoRoot, '.prettierrc'), 'utf8')).toContain(
      '"arrowParens": "avoid"',
    );
  });
});

/* ------------------------------------------------------------------ *
 * The proposed cheaper pin, and proof it is not a weakening.
 * ------------------------------------------------------------------ */

/**
 * What the pin is actually about: the set of PROPERTY names the walk reads,
 * plus the names it destructures out. Receiver identifiers are not part of the
 * rule — `output` vs `txOut` changes nothing an attacker can use — so leaving
 * them out removes the rename/destructure friction above.
 *
 * Members that are never evidence are excluded by name; that list is short and
 * a new one shows up as an unexplained addition to the pinned set, which is the
 * review moment the original pin was built for.
 */
const NON_EVIDENCE_MEMBERS = new Set([
  '__typename',
  'every',
  'fromString',
  'length',
  'map',
  'push',
]);

/** Namespaces, not transaction data. */
const NAMESPACE_RECEIVERS = new Set([
  'Array',
  'Cardano',
  'CertificateType',
  'GovernanceActionType',
  'Serialization',
]);

const propertiesRead = (source: string): string[] => {
  const walk = blockSource(source, 'networkEvidence');
  const members = [...walk.matchAll(/\b([\w$]+)\.([A-Za-z_$][\w$]*)/g)]
    .filter(([, receiver]) => !NAMESPACE_RECEIVERS.has(receiver))
    .map(([, , name]) => name);
  const destructured = [...walk.matchAll(/(?:const|let)\s*\{([^}]*)\}\s*=/g)]
    .flatMap(([, names]) => names.split(','))
    .map(name => name.trim().split(':')[0].trim())
    .filter(Boolean);
  return [...new Set([...members, ...destructured])]
    .filter(name => !NON_EVIDENCE_MEMBERS.has(name))
    .sort();
};

const EXPECTED_PROPERTIES = [
  'address',
  'body',
  'certificates',
  'collateralReturn',
  'directDeposits',
  'governanceAction',
  'networkId',
  'outputs',
  'owners',
  'poolParameters',
  'proposalProcedures',
  'rewardAccount',
  'stakeAddress',
  'subTransactions',
  'withdrawals',
].sort();

describe('a property-name pin keeps the guarantee without the friction', () => {
  it('matches all three stacks today', () => {
    for (const [stack, source] of Object.entries(SOURCES))
      expect(propertiesRead(source), stack).toEqual(EXPECTED_PROPERTIES);
  });

  it('survives every false positive above', () => {
    const renamed = MODULE_WALK.replaceAll(/\boutput\b/g, 'txOut');
    const destructured = MODULE_WALK.replace(
      'const evidence: NetworkEvidence[] = [];',
      `const evidence: NetworkEvidence[] = [];
  const { certificates, networkId, outputs, proposalProcedures, withdrawals, directDeposits } =
    body as Cardano.TxBody;`,
    )
      .replace(
        'if (body.networkId !== undefined)',
        'if (networkId !== undefined)',
      )
      .replace('evidence.push(body.networkId);', 'evidence.push(networkId);')
      .replace(
        'for (const output of body.outputs)',
        'for (const output of outputs)',
      )
      .replace('...(body.withdrawals ?? []),', '...(withdrawals ?? []),')
      .replace('...(body.directDeposits ?? []),', '...(directDeposits ?? []),')
      .replace(
        'for (const proposal of body.proposalProcedures ?? [])',
        'for (const proposal of proposalProcedures ?? [])',
      )
      .replace(
        'for (const certificate of body.certificates ?? [])',
        'for (const certificate of certificates ?? [])',
      );
    for (const variant of [renamed, destructured])
      expect(propertiesRead(variant)).toEqual(EXPECTED_PROPERTIES);
  });

  it('still catches a dropped evidence source the receiver pin misses', () => {
    // Pool OWNER addresses reach the walk only through a destructured `owners`,
    // so no `<receiver>.<property>` pair names them: deleting that line leaves
    // the receiver pin fully green while the walk stops reading real evidence.
    const gutted = MODULE_WALK.replace(
      '    const { owners, rewardAccount } = certificate.poolParameters;\n    evidence.push(evidenceOfAddress(rewardAccount));\n    // Owners cannot disagree with the pool reward account, and are walked\n    // anyway so the loop need not be re-added if that changes: on the wire an\n    // owner is a bare key hash, and PoolParams.toCore synthesises each owner\n    // reward account using the POOL reward account network id. Not a second,\n    // independent source of evidence.\n    evidence.push(...owners.map(evidenceOfAddress));',
      '    const { rewardAccount } = certificate.poolParameters;\n    evidence.push(evidenceOfAddress(rewardAccount));',
    );
    expect(gutted, 'the anchor text moved').not.toEqual(MODULE_WALK);
    expect(
      evidenceOverFixtures(compileWalk(gutted)),
      'this variant must really lose evidence',
    ).not.toEqual(evidenceOverFixtures(compileWalk(MODULE_WALK)));

    expect(fieldsRead(gutted), 'the receiver pin stays green').toEqual(
      BASELINE_FIELDS,
    );
    expect(propertiesRead(gutted), 'the property pin goes red').not.toEqual(
      EXPECTED_PROPERTIES,
    );
  });

  it('still catches a dropped whole branch', () => {
    const gutted = MODULE_WALK.replace(
      "  if ('collateralReturn' in body && body.collateralReturn)\n    evidence.push(evidenceOfAddress(body.collateralReturn.address));\n",
      '',
    );
    expect(gutted, 'the anchor text moved').not.toEqual(MODULE_WALK);
    expect(propertiesRead(gutted)).not.toContain('collateralReturn');
  });
});
