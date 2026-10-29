/**
 * The network-binding rule exists THREE times — once per stack that answers
 * CIP-30 from its own handler, because none of the three can import from the
 * others. That duplication is deliberate and documented in each file, and it
 * has already failed once in the way duplication always fails: a fix landed in
 * two of the three and the third stayed exploitable for two commits.
 *
 * This test is the mechanical guard against that. It compares the three walks
 * by the SET OF FIELDS each reads, because that set is what the rule actually
 * is — a field one walk reads and another does not is a transaction one
 * product signs and another refuses.
 *
 * Read as TEXT, never imported: the three live in different dependency
 * closures, and an import would be a real cross-stack dependency where none
 * should exist.
 *
 * To add an evidence source: add it to all three, then add it to
 * EXPECTED_FIELDS below. That pin is the review artifact — it makes a widening
 * of the rule a deliberate, visible change rather than a silent one.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');

const WALKS = {
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

/**
 * Every field the walk reads, as `<receiver>.<property>`. Widening this list
 * is a security fix (an unread network-bearing field costs a veto); narrowing
 * it is a regression.
 */
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

/**
 * The source of one named `const <name> = …` block, comments stripped.
 *
 * Anchored on a word boundary and required to be UNIQUE: `indexOf('const ' +
 * name)` is a prefix match, so a `networkEvidenceOfBody` sibling declared
 * earlier would shadow the live walk and this guard would pin the decoy. It
 * also slices the comment-stripped source, so a doc comment mentioning the
 * name cannot move the start of the block.
 */
const blockSource = (path: string, name: string): string => {
  const source = stripComments(readFileSync(path, 'utf8'));
  const matches = [...source.matchAll(new RegExp(`\\bconst ${name}\\b`, 'g'))];
  if (matches.length !== 1)
    throw new Error(
      `${path}: expected exactly one \`const ${name}\` declaration, found ` +
        `${matches.length} — it was renamed, duplicated or restructured, and ` +
        'this guard can no longer see it',
    );
  const start = matches[0].index;
  const end = source.indexOf('\n};', start);
  if (end === -1)
    throw new Error(
      `${path}: \`const ${name}\` has no \`\\n};\` terminator — it was ` +
        'restructured, and this guard can no longer see it',
    );
  return source.slice(start, end);
};

const walkSource = (path: string): string =>
  blockSource(path, 'networkEvidence');

const fieldsRead = (path: string): string[] => [
  ...new Set(
    [
      ...walkSource(path).matchAll(
        /\b(body|output|proposal|withdrawal|certificate|governanceAction|sub)\.([a-zA-Z]+)/g,
      ),
    ].map(([, receiver, property]) => `${receiver}.${property}`),
  ),
];

/**
 * The differences between the three copies that are LICENSED, spelled out one
 * by one. Everything else is drift.
 *
 * All of these are the same concession: the shell widens the SDK's
 * `NetworkId` enum to a plain `number`, because its network id arrives from
 * the service worker as a number and comparing it against the enum would be
 * an unsafe cross-type equality. Adding to this list is how you declare a new
 * intentional difference — and it should be hard to justify, because each one
 * is a place the three products can diverge unwatched.
 */
const LICENSED_DIFFERENCES: readonly (readonly [string, string])[] = [
  ['Number(networkId)', 'networkId'],
  ['Number(body.networkId)', 'body.networkId'],
  ['networkId: number', 'networkId: Cardano.NetworkId'],
  [
    'disagreeing.includes(1)',
    'disagreeing.includes(Cardano.NetworkId.Mainnet)',
  ],
];

/**
 * Every part of the rule the three stacks are supposed to spell identically.
 * `networkEvidence` is what counts as evidence; `evidenceOfAddress` is how one
 * element is classified; `spentOutpoints` and `everyInputIsOwn` are the
 * positive half — what makes a body that names no network acceptable anyway;
 * `integerMapKey`, `mapStatesDuplicateKeys` and `bodyStatesDuplicateKeys` veto
 * BOTH halves — bytes with two readings refuse before any evidence is
 * gathered — and the walk's DEPTH is the whole point of pinning them: a copy
 * that stops at the body's top-level map stops seeing a duplicated key inside
 * an output, which is the shape that hides a foreign payee behind an own
 * address. `networkBindingRefusal` is the verdict
 * AND which of the three causes it reports; `statedNetworkLabel` is what the
 * copy may then claim about the transaction's side.
 */
const PINNED_BLOCKS = [
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
] as const;

/**
 * The two stacks that answer a dApp in English. The shell has no entry here:
 * it renders the refusal through its own locale catalogue and never hands a
 * sentence to a dApp.
 */
const DAPP_FACING = {
  'dapp-connector module': WALKS['dapp-connector module'],
  'lace-next': WALKS['lace-next'],
} as const;

/**
 * `cborNetworkBindingRefusal` is here rather than in PINNED_BLOCKS because the
 * shell has no wire-format entry point — but it is where three of the four
 * production call sites reach the rule, so a dropped `ownUtxoRefs` forward
 * would revert the ownership half in one stack and nothing else would notice.
 *
 * What those two say to a dApp, pinned for the same reason the rule is: the
 * sentence is the product of the rule, and `statedNetworkLabel` returns a
 * DISCRIMINANT, so the words a user reads are chosen here and nowhere else.
 * Without this pin the label can stay in step while the two stacks tell the
 * same dApp different things.
 */
const PINNED_DAPP_BLOCKS = [
  'cborNetworkBindingRefusal',
  'cborStatedNetworkLabel',
  'networkBindingRefusalMessage',
] as const;

const normalised = (source: string): string =>
  LICENSED_DIFFERENCES.reduce(
    (text, [shell, canonical]) => text.replaceAll(shell, canonical),
    source,
  )
    .replaceAll(/\s+/g, ' ')
    .trim();

describe('network-binding walks stay in step across all three stacks', () => {
  // Canary FIRST: a silently-empty extraction would make every assertion below
  // vacuously true, which is the failure mode this whole guard exists to catch.
  it('the extractor actually finds fields (canary)', () => {
    for (const [stack, path] of Object.entries(WALKS))
      expect(
        fieldsRead(path).length,
        `${stack} extracted nothing`,
      ).toBeGreaterThan(5);
  });

  it('every stack reads exactly the pinned field set', () => {
    for (const [stack, path] of Object.entries(WALKS))
      expect(fieldsRead(path).sort(), stack).toEqual(EXPECTED_FIELDS);
  });

  it('the three copies are CHARACTER-IDENTICAL, not merely field-identical', () => {
    // The field set above is blind to what a walk DOES with a field. Deleting
    // `for (const owner of owners) …` leaves EXPECTED_FIELDS untouched — the
    // pool-owner addresses arrive through a destructuring, so no
    // `<receiver>.<property>` disappears — and so does inverting a
    // `__typename` comparison, or guarding a push behind an `if`.
    //
    // The three are supposed to be the SAME rule, so compare them as text and
    // the whole class goes away. A refactor applied to all three stays green;
    // one applied to a single stack is exactly the drift this file exists to
    // catch, and turns red.
    for (const name of PINNED_BLOCKS) {
      const [reference, ...rest] = Object.entries(WALKS).map(
        ([stack, path]) =>
          [stack, normalised(blockSource(path, name))] as const,
      );
      for (const [stack, source] of rest)
        expect(
          source,
          `${stack} \`${name}\` has drifted from ${reference[0]}`,
        ).toBe(reference[1]);
      // Non-vacuous: an empty or trivial extraction would make this pass for
      // every stack at once.
      expect(reference[1].length, `${name} extracted nothing`).toBeGreaterThan(
        60,
      );
    }
    // And the compared text really is the rule.
    expect(
      normalised(blockSource(WALKS['extension shell'], 'networkEvidence')),
    ).toContain('subTransactions');
  });

  it('the two dApp-facing stacks word the refusal IDENTICALLY', () => {
    for (const name of PINNED_DAPP_BLOCKS) {
      const [reference, ...rest] = Object.entries(DAPP_FACING).map(
        ([stack, path]) =>
          [stack, normalised(blockSource(path, name))] as const,
      );
      for (const [stack, source] of rest)
        expect(
          source,
          `${stack} \`${name}\` has drifted from ${reference[0]}`,
        ).toBe(reference[1]);
      expect(reference[1].length, `${name} extracted nothing`).toBeGreaterThan(
        60,
      );
    }
    // And the compared text really is the copy: the phrase the discriminant
    // resolves to lives here, not in statedNetworkLabel.
    expect(
      normalised(
        blockSource(
          DAPP_FACING['dapp-connector module'],
          'networkBindingRefusalMessage',
        ),
      ),
    ).toContain("'a testnet'");
  });

  it('every stack spells the fail-closed default the same way', () => {
    // Not a PINNED_BLOCK: `blockSource` slices to the first `\n};` and this is
    // a one-line const. It is the value a caller with no evidence gets, so a
    // copy whose default held a member would accept a body the others refuse —
    // the fail-OPEN direction, and invisible to every other assertion here.
    for (const [stack, path] of Object.entries(WALKS))
      expect(stripComments(readFileSync(path, 'utf8')), stack).toContain(
        'const NO_OWN_UTXO_REFS: ReadonlySet<string> = new Set();',
      );
  });

  it('every stack bounds the cbor walk at the same depth', () => {
    // Another one-line const, and the one value that must not drift: the
    // bound exists so the three engines answer alike, so a copy carrying a
    // different number reintroduces the divergence it removes.
    for (const [stack, path] of Object.entries(WALKS))
      expect(stripComments(readFileSync(path, 'utf8')), stack).toContain(
        'const MAX_CBOR_DEPTH = 64;',
      );
  });

  it('every stack declares the ambiguous-bytes report', () => {
    // Also a one-line const `blockSource` cannot slice. The pin is that all
    // three copies HAVE the refusal arm: a copy that dropped the constant
    // drops the veto with it, and no per-block text comparison notices the
    // absence of a block.
    //
    // The `export` modifier is deliberately outside the match, as it is for
    // `blockSource`: a copy exports only what its own callers consume, so the
    // shell and the module export this and lace-next does not.
    for (const [stack, path] of Object.entries(WALKS))
      expect(stripComments(readFileSync(path, 'utf8')), stack).toContain(
        "const UNREADABLE_BYTES = 'unreadable-bytes' as const;",
      );
  });

  it('every stack keeps BOTH halves of the rule, and reports them as DISTINCT causes', () => {
    for (const [stack, path] of Object.entries(WALKS)) {
      const code = blockSource(path, 'networkBindingRefusal');
      // "at least one element must speak" — dropping this turns the rule into
      // "refuse only what visibly disagrees", which signs a body that says
      // nothing at all.
      expect(code, `${stack} lost the non-empty half`).toContain(
        'evidence.length === 0',
      );
      // "and no element may disagree".
      expect(code, `${stack} lost the unanimity half`).toMatch(
        /evidence\.every\(\s*stated => stated === networkId\s*\)/,
      );
      // The prompt names WHICH of the two it hit, so the halves must stay
      // separately reportable — collapsing them back into one boolean is the
      // regression this pins.
      for (const cause of [
        'states-no-network',
        'states-other-network',
        'states-unreadable-element',
      ])
        expect(code, `${stack} lost the ${cause} cause`).toContain(
          `'${cause}'`,
        );
      // The NEGATION on the conflict arm. Without anchoring it, dropping the
      // `!` inverts the rule while every assertion above stays green — and,
      // worse, the correct `.some(!==)` rewrite would fail instead.
      expect(code, `${stack} lost the conflict arm's negation`).toMatch(
        /stated !== 'unreadable' && stated !== networkId/,
      );
    }
  });

  it('every stack classifies an undecodable address the same way', () => {
    // NOT covered by the field set: `evidenceOfAddress` reads no `<x>.<y>`
    // the extractor matches, so a stack could change `'unreadable'` to a
    // silent drop or a default and the pin above would stay green. This is
    // the fail-open direction — an address we cannot classify must not read
    // as agreement.
    const bodies = Object.fromEntries(
      Object.entries(WALKS).map(([stack, path]) => [
        stack,
        blockSource(path, 'evidenceOfAddress').replaceAll(/\s+/g, ' ').trim(),
      ]),
    );
    for (const [stack, body] of Object.entries(bodies)) {
      expect(body, `${stack} stopped answering 'unreadable'`).toContain(
        "'unreadable'",
      );
      expect(
        body,
        `${stack} stopped testing for an undecodable address`,
      ).toContain("networkId ?? 'unreadable'");
    }
    // The shell widens the network type to number; runtime classification
    // must remain equivalent across all three stacks.
    const normalised = Object.values(bodies).map(body =>
      body.replaceAll('Number(networkId)', 'networkId'),
    );
    expect(
      new Set(normalised).size,
      'the three differ beyond the Number() widening',
    ).toBe(1);
  });
});
