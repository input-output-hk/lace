export type MigrationReportTransaction = {
  index: number;
  txId: string;
  sourceAccountIndex?: number;
  destinationAccountIndex?: number;
  destinationAddress?: string;
};

export type MigrationReportInput = {
  mode: 'consolidate' | 'preserve' | undefined;
  network?: string;
  source: { name?: string; type?: string };
  destination: { name?: string; type?: string };
  transactions: readonly MigrationReportTransaction[];
  /** Source accounts left behind, e.g. rewards-only accounts preserve refuses. */
  retainedSourceAccountIndexes?: readonly number[];
  rewardsSetup?: {
    status: string;
    /**
     * One per destination account set up, not one per migration: a preserved
     * migration into three destinations registers and delegates three stake
     * keys, in three transactions.
     */
    transactions?: readonly {
      txId: string;
      destinationAccountIndex?: number;
    }[];
  };
};

const line = (label: string, value: string) => `${label}: ${value}`;

const describeTransaction = ({
  index,
  txId,
  sourceAccountIndex,
  destinationAccountIndex,
  destinationAddress,
}: MigrationReportTransaction): string[] => {
  const route =
    sourceAccountIndex === undefined && destinationAccountIndex === undefined
      ? undefined
      : `source account ${sourceAccountIndex ?? '?'} -> destination account ${
          destinationAccountIndex ?? '?'
        }`;
  return [
    `${index + 1}. ${txId}`,
    ...(route ? [`   ${route}`] : []),
    ...(destinationAddress ? [`   paid to ${destinationAddress}`] : []),
  ];
};

/**
 * Findings derived from the submitted transactions, never from what the wizard
 * intended. Preserve mode's whole claim is that no two source accounts meet in
 * one transaction and each lands in its own account; both are properties of
 * on-chain data, so the report recomputes them and says so plainly when the
 * data does not hold up.
 */
const auditFindings = ({
  mode,
  transactions,
  rewardsSetup,
}: Pick<
  MigrationReportInput,
  'mode' | 'rewardsSetup' | 'transactions'
>): string[] => {
  const attributed = transactions.filter(
    tx => tx.sourceAccountIndex !== undefined,
  );
  if (mode !== 'preserve' || attributed.length === 0) return [];

  const sourcesPerTxId = new Map<string, Set<number>>();
  const destinationsPerSource = new Map<number, Set<string>>();
  const sourcesPerDestination = new Map<string, Set<number>>();
  for (const tx of attributed) {
    const source = tx.sourceAccountIndex as number;
    sourcesPerTxId.set(
      tx.txId,
      (sourcesPerTxId.get(tx.txId) ?? new Set()).add(source),
    );
    const destination =
      tx.destinationAddress ?? `account-${tx.destinationAccountIndex}`;
    destinationsPerSource.set(
      source,
      (destinationsPerSource.get(source) ?? new Set()).add(destination),
    );
    sourcesPerDestination.set(
      destination,
      (sourcesPerDestination.get(destination) ?? new Set()).add(source),
    );
  }

  const coSpending = [...sourcesPerTxId.entries()].filter(
    ([, sources]) => sources.size > 1,
  );
  const sharedDestinations = [...sourcesPerDestination.entries()].filter(
    ([, sources]) => sources.size > 1,
  );

  // A set-up that ran for some destinations and not others is the failure this
  // catches: every account that received funds needs its own registration and
  // delegation, and the outcome alone reports the last one for all of them.
  const setUpIndexes = new Set(
    (rewardsSetup?.transactions ?? []).flatMap(({ destinationAccountIndex }) =>
      destinationAccountIndex === undefined ? [] : [destinationAccountIndex],
    ),
  );
  const paidIndexes = [
    ...new Set(
      attributed.flatMap(({ destinationAccountIndex }) =>
        destinationAccountIndex === undefined ? [] : [destinationAccountIndex],
      ),
    ),
  ].sort((a, b) => a - b);
  const missingSetUp = paidIndexes.filter(index => !setUpIndexes.has(index));

  return [
    line('Source accounts migrated', `${destinationsPerSource.size}`),
    line('Distinct destinations paid', `${sourcesPerDestination.size}`),
    ...(rewardsSetup === undefined || setUpIndexes.size === 0
      ? []
      : missingSetUp.length === 0
      ? [
          'OK: every destination that received funds has its own rewards set-up transaction.',
        ]
      : [
          `PROBLEM: destination accounts ${missingSetUp.join(
            ', ',
          )} received funds but have no rewards set-up transaction.`,
        ]),
    ...(coSpending.length === 0
      ? ['OK: no transaction spends from more than one source account.']
      : coSpending.map(
          ([txId, sources]) =>
            `PROBLEM: ${txId} spends from source accounts ${[...sources]
              .sort((a, b) => a - b)
              .join(', ')} — those accounts are linked on-chain.`,
        )),
    ...(sharedDestinations.length === 0
      ? ['OK: each source account paid a destination no other source paid.']
      : sharedDestinations.map(
          ([destination, sources]) =>
            `PROBLEM: ${destination} received from source accounts ${[
              ...sources,
            ]
              .sort((a, b) => a - b)
              .join(', ')} — those accounts are linked on-chain.`,
        )),
  ];
};

/**
 * A plain-text account of what the migration submitted, for pasting into a bug
 * report or checking against an explorer. Every claim in it is either a
 * recorded fact (tx ids, the mapping each transaction carried) or a finding
 * recomputed from those facts — it states no intent.
 */
export const buildMigrationReport = ({
  mode,
  network,
  source,
  destination,
  transactions,
  retainedSourceAccountIndexes,
  rewardsSetup,
}: MigrationReportInput): string => {
  const findings = auditFindings({ mode, transactions, rewardsSetup });
  return [
    'Lace wallet migration report',
    '',
    line('Mode', mode ?? 'unknown'),
    ...(network ? [line('Network', network)] : []),
    line(
      'Source wallet',
      `${source.name ?? 'unknown'}${source.type ? ` (${source.type})` : ''}`,
    ),
    line(
      'Destination wallet',
      `${destination.name ?? 'unknown'}${
        destination.type ? ` (${destination.type})` : ''
      }`,
    ),
    '',
    `Transfer transactions (${transactions.length})`,
    ...(transactions.length === 0
      ? ['none recorded']
      : transactions.flatMap(describeTransaction)),
    ...(retainedSourceAccountIndexes && retainedSourceAccountIndexes.length > 0
      ? [
          '',
          // "account N", not a bare index: this is a LIST, and the line below
          // it ("Source accounts migrated: 3") is a COUNT. A retained account 0
          // therefore rendered as "Source accounts not migrated: 0", which
          // reads as "none" — the opposite of what happened, in a report
          // written to be checked.
          line(
            'Source accounts not migrated',
            [...retainedSourceAccountIndexes]
              .sort((a, b) => a - b)
              .map(index => `account ${index}`)
              .join(', '),
          ),
        ]
      : []),
    ...(rewardsSetup
      ? [
          '',
          `Rewards set-up transactions (${
            rewardsSetup.transactions?.length ?? 0
          })`,
          line('Status', rewardsSetup.status),
          ...(rewardsSetup.transactions ?? []).flatMap(
            ({ txId, destinationAccountIndex }, index) => [
              `${index + 1}. ${txId}`,
              ...(destinationAccountIndex === undefined
                ? []
                : [
                    `   registers and delegates destination account ${destinationAccountIndex}`,
                  ]),
            ],
          ),
        ]
      : []),
    ...(findings.length > 0 ? ['', 'Findings', ...findings] : []),
    '',
    'To verify: look up each transaction id above on a Cardano explorer. Its',
    'inputs should all belong to the stated source account, and its outputs',
    'should pay the stated destination address.',
  ].join('\n');
};
