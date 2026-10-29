import { Cardano, Serialization } from '@cardano-sdk/core';
import { blake2b, Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  custodyGrantAssetId,
  custodyGrantTokenName,
  encodeCustodyAccountState,
  encodeCustodyGrant,
  encodeCustodyMintRedeemer,
  findCustodySponsorRuleViolations,
} from '../src';

import {
  ACCOUNT_VALIDATOR_HASH,
  NFT,
  POOL_ID,
  SPONSOR_ADDRESS,
  SPONSOR_KEY,
  STAKE_CREDENTIAL,
  STRANGER_ADDRESS,
  VALID_UNTIL,
  account,
  baseAddress,
  buildTransaction,
  controlOutput,
  device,
  enterpriseAddress,
  fund,
  fundOutput,
  identity,
  otherAccount,
  otherIdentity,
  payout,
  sponsorCollateral,
  sponsorFee,
  utxo,
  withRedeemer,
} from './custody-transactions';
import {
  AGENT_KEY,
  OTHER_DEVICE_KEY,
  OWNER_KEY,
  fixtureGrants,
  grantedState,
  initialState,
} from './fixtures';

import type {
  CustodyAccountState,
  CustodyGrant,
  CustodySponsorRuleContext,
  CustodySponsorRuleViolation,
} from '../src';
import type { TransactionShape } from './custody-transactions';
import type { Hash32ByteBase16 } from '@cardano-sdk/crypto';

const keyCredential = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: Hash28ByteBase16(hash),
});
const scriptCredential = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.ScriptHash,
  hash: Hash28ByteBase16(hash),
});
const rewardAccountOf = (credential: Cardano.Credential) =>
  Cardano.RewardAccount.fromCredential(credential, Cardano.NetworkId.Testnet);

const VERSION = CURRENT_CUSTODY_CONTRACT_VERSION;
const [LOGIC] = VERSION.logics;
/**
 * Upstream's second logic applied to the account proxy, pinned as
 * `SECOND_APPLIED_HASH` in offchain/test/logic.test.ts: a logic the
 * contract can run that Lace does not know.
 */
const UNKNOWN_LOGIC = Hash28ByteBase16(
  '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d',
);
const LOGIC_REWARD_ACCOUNT = rewardAccountOf(scriptCredential(LOGIC.hash));
const UNKNOWN_LOGIC_REWARD_ACCOUNT = rewardAccountOf(
  scriptCredential(UNKNOWN_LOGIC),
);
/** The withdrawal of zero that runs the logic a control datum names. */
const logicRun: Cardano.Withdrawal = {
  stakeAddress: LOGIC_REWARD_ACCOUNT,
  quantity: 0n,
};

const FOREIGN_SCRIPT = 'fa'.repeat(28);
const SPONSOR_STAKE_KEY = 'ba'.repeat(28);
/** The sponsor's wallet: its payment key and its stake key. */
const SPONSOR_BASE_ADDRESS = baseAddress(
  keyCredential(SPONSOR_KEY),
  keyCredential(SPONSOR_STAKE_KEY),
);
const SPONSOR_REWARD_ACCOUNT = rewardAccountOf(
  keyCredential(SPONSOR_STAKE_KEY),
);
const FOREIGN_REWARD_ACCOUNT = rewardAccountOf(
  scriptCredential(FOREIGN_SCRIPT),
);
const STRANGER_REWARD_ACCOUNT = rewardAccountOf(keyCredential('ff'.repeat(28)));
const TOKEN = Cardano.AssetId(`${'99'.repeat(28)}746f6b656e`);

/**
 * A Plutus V3 cost model and its language view as the ledger encodes it: a
 * map from the language's id, 2, to the costs as a definite length list.
 */
const COST_MODELS: Cardano.CostModels = new Map([
  [Cardano.PlutusLanguageVersion.V3, [1, 2, 3]],
]);
const V3_LANGUAGE_VIEW = 'a10283010203';

/** A UTxO the contract's network setup parked a script in on Preprod. */
const parkedUtxo = (
  scriptHash: string,
  script: Cardano.PlutusScript,
): Cardano.Utxo => {
  const parked = VERSION.referenceScripts[Cardano.NetworkMagics.Preprod]?.find(
    candidate => candidate.scriptHash === scriptHash,
  );
  if (!parked) throw new Error(`No parked UTxO holds ${scriptHash}`);
  return [
    { ...parked.txIn, address: parked.address },
    {
      address: parked.address,
      value: { coins: parked.coins },
      scriptReference: script,
    },
  ];
};
const parkedProxy = parkedUtxo(
  VERSION.accountValidatorHash,
  VERSION.accountValidator,
);
const parkedLogic = parkedUtxo(LOGIC.hash, LOGIC.script);

const feeMode: CustodySponsorRuleContext['mode'] = {
  kind: 'fee',
  feeUtxo: sponsorFee,
  maxSponsoredLovelace: 6_000_000n,
};

const context = (
  overrides: Partial<CustodySponsorRuleContext> = {},
): CustodySponsorRuleContext => ({
  mode: feeMode,
  sponsorAddress: SPONSOR_ADDRESS,
  collateralUtxo: sponsorCollateral,
  contractVersion: VERSION,
  networkMagic: Cardano.NetworkMagics.Preprod,
  latestValiditySlot: VALID_UNTIL,
  currentSlot: Cardano.Slot(VALID_UNTIL - 600),
  collateralPercentage: 150,
  costModels: COST_MODELS,
  ...overrides,
});

const collateralMode = (
  overrides: Partial<CustodySponsorRuleContext> = {},
): CustodySponsorRuleContext =>
  context({ mode: { kind: 'collateral' }, ...overrides });

/**
 * A sponsored creation that attaches the proxy, the logic and the stake
 * script: the fee UTxO pays the fee, the deposit and the control output.
 */
const sponsoredCreation = (
  overrides: Partial<TransactionShape> = {},
): TransactionShape => ({
  inputs: [sponsorFee],
  outputs: [
    controlOutput(initialState, 2_100_000n),
    payout(700_000n, SPONSOR_ADDRESS),
  ],
  mint: new Map([[NFT, 1n]]),
  mintRedeemer: encodeCustodyMintRedeemer({ kind: 'createAccount' }),
  certificates: [
    {
      __typename: Cardano.CertificateType.Registration,
      stakeCredential: STAKE_CREDENTIAL,
      deposit: 2_000_000n,
    },
  ],
  withdrawals: [logicRun],
  collaterals: [sponsorCollateral],
  collateralReturn: payout(4_500_000n, SPONSOR_ADDRESS),
  requiredSigners: [OWNER_KEY],
  invalidHereafter: VALID_UNTIL,
  scripts: [VERSION.accountValidator, LOGIC.script, identity.stakeScript],
  body: { totalCollateral: 500_000n },
  ...overrides,
});

/** A sponsored creation that takes the proxy and the logic from where they are parked. */
const referencedCreation = (
  overrides: Partial<TransactionShape> = {},
): TransactionShape =>
  sponsoredCreation({
    referenceInputs: [parkedProxy, parkedLogic],
    scripts: [identity.stakeScript],
    ...overrides,
  });

/** A creation whose control output carries `datum` in place of the initial state. */
const creationWithDatum = (datum: Cardano.PlutusData): TransactionShape =>
  sponsoredCreation({
    outputs: [
      { ...controlOutput(initialState, 2_100_000n), datum },
      payout(700_000n, SPONSOR_ADDRESS),
    ],
  });

/** The initial state's datum with its fields rewritten. */
const initialDatumWith = (
  rewrite: (fields: Cardano.PlutusData[]) => Cardano.PlutusData[],
): Cardano.ConstrPlutusData => {
  const datum = encodeCustodyAccountState(initialState);
  if (!Cardano.util.isConstrPlutusData(datum)) throw new Error('constr');
  return {
    ...datum,
    fields: { items: rewrite([...datum.fields.items]) },
  };
};

const control = utxo(0x10, controlOutput(initialState));
const fundInput = utxo(0x11, fundOutput(10_000_000n));

/** An account-paid operation: control and funds in, control and change back. */
const accountPaid = (
  overrides: Partial<TransactionShape> = {},
): TransactionShape => ({
  inputs: [control, fundInput],
  spendRedeemers: [device(control), fund(fundInput)],
  outputs: [controlOutput(initialState), fundOutput(9_800_000n)],
  withdrawals: [logicRun],
  collaterals: [sponsorCollateral],
  collateralReturn: payout(4_700_000n, SPONSOR_ADDRESS),
  requiredSigners: [OWNER_KEY],
  invalidHereafter: VALID_UNTIL,
  scripts: [VERSION.accountValidator, LOGIC.script],
  body: { totalCollateral: 300_000n },
  ...overrides,
});

const [grant, otherGrant] = fixtureGrants;
const GRANT_TOKEN = custodyGrantAssetId(account, grant.slot);

/** A grant UTxO: its token and the grant inline, at the account address. */
const grantOutput = (held: CustodyGrant = grant): Cardano.TxOut => ({
  address: identity.address,
  value: {
    coins: 1_500_000n,
    assets: new Map([[custodyGrantAssetId(account, held.slot), 1n]]),
  },
  datum: encodeCustodyGrant(held),
});

const grantedControl = utxo(0x12, controlOutput(grantedState));
const grantInput = utxo(0x13, grantOutput());

/**
 * An agent spend paying 2 tADA to the stranger: the grant UTxO and a fund
 * UTxO in, the control UTxO referenced, the grant recreated with its caps
 * lowered and the change back to the account.
 */
const agentSpend = (
  overrides: Partial<TransactionShape> = {},
): TransactionShape => ({
  inputs: [grantInput, fundInput],
  spendRedeemers: [
    withRedeemer(grantInput, { kind: 'spendWithGrant' }),
    fund(fundInput),
  ],
  referenceInputs: [grantedControl],
  outputs: [
    grantOutput({
      ...grant,
      scope: { ...grant.scope, cap: grant.scope.cap - 2_200_000n },
    }),
    payout(2_000_000n),
    fundOutput(7_800_000n),
  ],
  withdrawals: [logicRun],
  collaterals: [sponsorCollateral],
  collateralReturn: payout(4_700_000n, SPONSOR_ADDRESS),
  requiredSigners: [AGENT_KEY],
  invalidHereafter: VALID_UNTIL,
  scripts: [VERSION.accountValidator, LOGIC.script],
  body: { totalCollateral: 300_000n },
  ...overrides,
});

/** The control UTxO of the other fixture account. */
const otherControl = utxo(0x16, {
  address: otherIdentity.address,
  value: {
    coins: 2_000_000n,
    assets: new Map([[otherIdentity.stateNftAssetId, 1n]]),
  },
  datum: encodeCustodyAccountState(initialState),
});

type Built = ReturnType<typeof buildTransaction>['transaction'];

/**
 * The script data hash a witness set calls for under `COST_MODELS`, when
 * every script the transaction carries is Plutus V3.
 */
const scriptDataHashOf = (transaction: Built): Hash32ByteBase16 | undefined => {
  const witnessSet = transaction.witnessSet();
  const redeemers = witnessSet.redeemers()?.toCbor();
  const datums = witnessSet.plutusData()?.toCbor();
  return redeemers === undefined && datums === undefined
    ? undefined
    : blake2b.hash(
        HexBlob(`${redeemers ?? 'a0'}${datums ?? ''}${V3_LANGUAGE_VIEW}`),
        32,
      );
};

/** The transaction with its body committing to `hash`, its witness set as it was. */
const committing =
  (hash: Hash32ByteBase16 | undefined) =>
  (transaction: Built): Built => {
    transaction.setBody(
      Serialization.TransactionBody.fromCore({
        ...transaction.body().toCore(),
        scriptIntegrityHash: hash,
      }),
    );
    return Serialization.Transaction.fromCbor(transaction.toCbor());
  };

/** The transaction committing to the script data hash its witness set calls for. */
const hashed = (transaction: Built): Built =>
  committing(scriptDataHashOf(transaction))(transaction);

const violationsOf = (
  shape: TransactionShape,
  ruleContext: CustodySponsorRuleContext = context(),
  transform: (transaction: Built) => Built = transaction => transaction,
): CustodySponsorRuleViolation[] => {
  const { transaction, resolvedInputs } = buildTransaction(shape);
  return findCustodySponsorRuleViolations(
    transform(hashed(transaction)),
    resolvedInputs,
    ruleContext,
  );
};

const violationOf = (
  rule: CustodySponsorRuleViolation['rule'],
  ...args: Parameters<typeof violationsOf>
): CustodySponsorRuleViolation | undefined =>
  violationsOf(...args).find(violation => violation.rule === rule);

const outpoint = ([{ txId, index }]: Cardano.Utxo): Cardano.TxIn => ({
  txId,
  index,
});

const vote = {
  actionId: { id: '00'.repeat(32) as Cardano.TransactionId, actionIndex: 0 },
  votingProcedure: { vote: Cardano.Vote.yes, anchor: null },
};

describe('findCustodySponsorRuleViolations', () => {
  it('accepts a sponsored creation that attaches the proxy and the logic, in fee mode', () => {
    expect(violationsOf(sponsoredCreation())).toEqual([]);
  });

  it('accepts a sponsored creation that references the proxy and the logic where they are parked', () => {
    expect(violationsOf(referencedCreation())).toEqual([]);
  });

  it('accepts an account-paid operation in collateral mode', () => {
    expect(violationsOf(accountPaid(), collateralMode())).toEqual([]);
  });

  it('accepts an agent spend that spends the grant UTxO and a fund UTxO and references the control UTxO', () => {
    expect(violationsOf(agentSpend(), collateralMode())).toEqual([]);
  });

  it('accepts an agent spend that attaches nothing and references every script it runs', () => {
    expect(
      violationsOf(
        agentSpend({
          referenceInputs: [grantedControl, parkedProxy, parkedLogic],
          scripts: undefined,
        }),
        collateralMode(),
      ),
    ).toEqual([]);
  });

  it('accepts an owner operation paid from a reserve, recreated with the fee taken out', () => {
    const reserveDatum: Cardano.PlutusData = {
      constructor: 0n,
      fields: { items: [] },
    };
    const reserve = utxo(0x14, {
      ...fundOutput(20_000_000n),
      datum: reserveDatum,
    });
    expect(
      violationsOf(
        accountPaid({
          inputs: [control, reserve],
          spendRedeemers: [device(control), fund(reserve)],
          outputs: [
            controlOutput(initialState),
            { ...fundOutput(19_800_000n), datum: reserveDatum },
          ],
        }),
        collateralMode(),
      ),
    ).toEqual([]);
  });

  it('accepts a sweep that spends the control UTxO and a dead grant UTxO and burns the grant token', () => {
    const revokedControl = utxo(
      0x12,
      controlOutput({ ...grantedState, revoked: [grant.slot] }),
    );
    expect(
      violationsOf(
        accountPaid({
          inputs: [revokedControl, grantInput, fundInput],
          spendRedeemers: [
            device(revokedControl),
            withRedeemer(grantInput, { kind: 'sweepGrant' }),
            fund(fundInput),
          ],
          outputs: [
            controlOutput({ ...grantedState, outstanding: 2n }, 3_500_000n),
            fundOutput(9_800_000n),
          ],
          mint: new Map([[GRANT_TOKEN, -1n]]),
          mintRedeemer: encodeCustodyMintRedeemer({ kind: 'burnGrants' }),
        }),
        collateralMode(),
      ),
    ).toEqual([]);
  });

  it('accepts an owner operation whose fee the control output pays', () => {
    const headroom = utxo(0x15, controlOutput(initialState, 3_500_000n));
    expect(
      violationsOf(
        accountPaid({
          inputs: [headroom],
          spendRedeemers: [device(headroom)],
          outputs: [controlOutput(initialState, 3_300_000n)],
        }),
        collateralMode(),
      ),
    ).toEqual([]);
  });

  it('reads a transaction without scripts, redeemers or required signers', () => {
    expect(
      violationsOf(
        accountPaid({
          scripts: undefined,
          spendRedeemers: undefined,
          requiredSigners: undefined,
        }),
        collateralMode(),
      ),
    ).toEqual([]);
  });

  it('counts a withdrawal as the only supply when every input is the sponsor', () => {
    expect(
      violationOf(
        'no_sponsor_value_elsewhere',
        sponsoredCreation({
          outputs: [
            controlOutput(initialState, 2_100_000n),
            payout(700_000n, SPONSOR_ADDRESS),
            payout(1_000_000n),
          ],
          withdrawals: [
            logicRun,
            { stakeAddress: STRANGER_REWARD_ACCOUNT, quantity: 1_000_000n },
          ],
        }),
      ),
    ).toBeUndefined();
  });

  describe('well_formed', () => {
    it('refuses a transaction over the size the service inspects', () => {
      const padding: Cardano.PlutusScript = {
        ...LOGIC.script,
        bytes: HexBlob(`${LOGIC.script.bytes}00`),
      };
      expect(
        violationsOf(
          sponsoredCreation({
            scripts: [...(sponsoredCreation().scripts ?? []), padding],
          }),
        )[0],
      ).toEqual({
        rule: 'well_formed',
        reason: 'too-large',
        size: expect.any(Number) as unknown,
        limit: 16_384,
      });
    });

    it('refuses proposal procedures and treasury donations', () => {
      expect(
        violationsOf(
          sponsoredCreation({
            body: {
              totalCollateral: 500_000n,
              proposalProcedures: [
                {
                  deposit: 1n,
                  rewardAccount: STRANGER_REWARD_ACCOUNT,
                  governanceAction: {
                    __typename: Cardano.GovernanceActionType.info_action,
                  },
                  anchor: {
                    url: 'https://example.com',
                    dataHash: '00'.repeat(32) as never,
                  },
                },
              ],
            },
          }),
        )[0],
      ).toEqual({ rule: 'well_formed', reason: 'proposal-procedures' });
      expect(
        violationsOf(
          sponsoredCreation({
            body: { totalCollateral: 500_000n, donation: 1n },
          }),
        )[0],
      ).toEqual({ rule: 'well_formed', reason: 'treasury-donation' });
    });
  });

  describe('sponsor inputs', () => {
    it('refuses a fee mode transaction without the leased fee UTxO', () => {
      const other = utxo(0x20, payout(5_000_000n, STRANGER_ADDRESS));
      expect(violationsOf(sponsoredCreation({ inputs: [other] }))[0]).toEqual({
        rule: 'uses_leased_fee_input',
        reason: 'fee-input-missing',
        input: outpoint(sponsorFee),
      });
    });

    it('refuses an input whose payment credential cannot be read', () => {
      const unreadable = utxo(0x21, {
        address: STRANGER_REWARD_ACCOUNT as unknown as Cardano.PaymentAddress,
        value: { coins: 1_000_000n },
      });
      expect(
        violationsOf(
          accountPaid({
            inputs: [control, unreadable],
            spendRedeemers: [device(control)],
          }),
          collateralMode(),
        )[0],
      ).toEqual({
        rule: 'no_sponsor_inputs',
        reason: 'unreadable-input',
        input: outpoint(unreadable),
      });
    });

    it('refuses another sponsor UTxO next to the leased one', () => {
      const another = utxo(0x22, payout(5_000_000n, SPONSOR_BASE_ADDRESS));
      expect(
        violationsOf(sponsoredCreation({ inputs: [sponsorFee, another] }))[0],
      ).toEqual({
        rule: 'uses_leased_fee_input',
        reason: 'sponsor-input',
        input: outpoint(another),
      });
    });

    it('refuses any sponsor input in collateral mode, the shared collateral included', () => {
      expect(
        violationsOf(
          accountPaid({ inputs: [control, fundInput, sponsorCollateral] }),
          collateralMode(),
        )[0],
      ).toEqual({
        rule: 'no_sponsor_inputs',
        reason: 'sponsor-input',
        input: outpoint(sponsorCollateral),
      });
    });

    it('reads an input without a resolution as the chain not knowing it', () => {
      const { transaction, resolvedInputs } = buildTransaction(accountPaid());
      expect(
        findCustodySponsorRuleViolations(
          hashed(transaction),
          resolvedInputs.filter(([input]) => input.txId !== fundInput[0].txId),
          collateralMode(),
        ),
      ).toEqual([]);
    });
  });

  describe('uses_shared_collateral', () => {
    const collateralViolation = (
      shape: Partial<TransactionShape>,
      mutate?: Parameters<typeof violationsOf>[2],
    ) =>
      violationOf(
        'uses_shared_collateral',
        accountPaid(shape),
        collateralMode(),
        mutate,
      );

    it('refuses a transaction flagged as failing phase two', () => {
      expect(
        collateralViolation({}, transaction =>
          Serialization.Transaction.fromCore({
            ...transaction.toCore(),
            isValid: false,
          }),
        ),
      ).toEqual({
        rule: 'uses_shared_collateral',
        reason: 'phase-two-invalid',
      });
    });

    it('refuses collateral other than exactly the shared UTxO', () => {
      const other = utxo(0x23, payout(5_000_000n, STRANGER_ADDRESS));
      for (const collaterals of [[other], [sponsorCollateral, other], []]) {
        expect(collateralViolation({ collaterals })).toEqual({
          rule: 'uses_shared_collateral',
          reason: 'collateral-inputs',
        });
      }
    });

    it('refuses a collateral return that does not plainly pay the sponsor', () => {
      expect(
        collateralViolation({ collateralReturn: undefined }),
      ).toMatchObject({ reason: 'no-collateral-return' });
      expect(
        collateralViolation({
          collateralReturn: payout(4_700_000n, STRANGER_ADDRESS),
        }),
      ).toMatchObject({ reason: 'collateral-return-address' });
      expect(
        collateralViolation({
          collateralReturn: {
            ...payout(4_700_000n, SPONSOR_ADDRESS),
            datumHash: '00'.repeat(32) as never,
          },
        }),
      ).toMatchObject({ reason: 'collateral-return-datum' });
      expect(
        collateralViolation({
          collateralReturn: {
            ...payout(4_700_000n, SPONSOR_ADDRESS),
            scriptReference: VERSION.accountValidator,
          },
        }),
      ).toMatchObject({ reason: 'collateral-return-reference-script' });
    });

    it('refuses a fee above what the shared collateral covers at the collateral percentage', () => {
      expect(
        collateralViolation({
          fee: 3_333_334n,
          body: { totalCollateral: 5_000_000n },
        }),
      ).toEqual({
        rule: 'uses_shared_collateral',
        reason: 'fee-exceeds-collateral',
        fee: 3_333_334n,
        limit: 3_333_333n,
      });
      expect(
        collateralViolation({
          fee: 3_333_333n,
          body: { totalCollateral: 5_000_000n },
        }),
      ).toBeUndefined();
    });

    it('reads a collateral percentage of zero as no fee ceiling', () => {
      expect(
        violationOf(
          'uses_shared_collateral',
          accountPaid({ fee: 10_000_000n }),
          collateralMode({ collateralPercentage: 0 }),
        ),
      ).toBeUndefined();
    });

    it('refuses a missing or excessive total collateral', () => {
      expect(collateralViolation({ body: {} })).toMatchObject({
        reason: 'no-total-collateral',
      });
      expect(
        collateralViolation({ body: { totalCollateral: 6_000_000n } }),
      ).toEqual({
        rule: 'uses_shared_collateral',
        reason: 'total-collateral-exceeds',
        totalCollateral: 6_000_000n,
        available: 5_000_000n,
      });
    });
  });

  describe('bounded_validity', () => {
    it('refuses an open upper bound', () => {
      expect(
        violationsOf(
          accountPaid({ invalidHereafter: undefined }),
          collateralMode(),
        ),
      ).toEqual([{ rule: 'bounded_validity', reason: 'no-upper-bound' }]);
    });

    it('refuses an upper bound past the latest the mode allows', () => {
      expect(
        violationsOf(
          accountPaid(),
          collateralMode({ latestValiditySlot: Cardano.Slot(VALID_UNTIL - 1) }),
        ),
      ).toEqual([
        {
          rule: 'bounded_validity',
          reason: 'upper-bound-too-late',
          upperBound: VALID_UNTIL,
          latest: VALID_UNTIL - 1,
        },
      ]);
    });

    it('refuses an upper bound that is not in the future', () => {
      expect(
        violationsOf(
          accountPaid(),
          collateralMode({ currentSlot: VALID_UNTIL }),
        ),
      ).toEqual([
        {
          rule: 'bounded_validity',
          reason: 'upper-bound-not-future',
          upperBound: VALID_UNTIL,
          current: VALID_UNTIL,
        },
      ]);
    });
  });

  describe('account_transaction', () => {
    const accountViolation = (shape: TransactionShape) =>
      violationOf('account_transaction', shape);

    it('refuses a transaction that neither operates nor creates an account', () => {
      expect(
        violationsOf(
          accountPaid({
            inputs: [fundInput],
            spendRedeemers: [fund(fundInput)],
            outputs: [fundOutput(9_800_000n)],
            withdrawals: undefined,
            scripts: [VERSION.accountValidator],
          }),
          collateralMode(),
        ),
      ).toEqual([
        { rule: 'account_transaction', reason: 'not-account-transaction' },
      ]);
    });

    it('refuses a creation that does not mint exactly one state NFT', () => {
      expect(
        accountViolation(sponsoredCreation({ mint: new Map([[NFT, 2n]]) })),
      ).toEqual({
        rule: 'account_transaction',
        reason: 'mint-count',
      });
    });

    it('refuses a creation that does not register exactly one script credential', () => {
      expect(
        accountViolation(sponsoredCreation({ certificates: [] })),
      ).toMatchObject({ reason: 'registration-count' });
    });

    it('refuses a state NFT named after another credential', () => {
      expect(
        accountViolation(
          sponsoredCreation({
            certificates: [
              {
                __typename: Cardano.CertificateType.Registration,
                stakeCredential: scriptCredential(
                  otherIdentity.stakeScriptHash,
                ),
                deposit: 2_000_000n,
              },
            ],
          }),
        ),
      ).toMatchObject({ reason: 'state-nft-name' });
    });

    it('refuses a state NFT that is not in one account output', () => {
      expect(
        accountViolation(
          sponsoredCreation({
            outputs: [
              {
                ...controlOutput(initialState, 2_100_000n),
                address: STRANGER_ADDRESS,
              },
              payout(700_000n, SPONSOR_ADDRESS),
            ],
          }),
        ),
      ).toMatchObject({ reason: 'control-output-placement' });
    });

    it('refuses a creation minting a token not named with the 28 bytes of a stake script hash', () => {
      expect(
        accountViolation(
          sponsoredCreation({
            mint: new Map([[GRANT_TOKEN, 1n]]),
            outputs: [
              {
                ...controlOutput(initialState, 2_100_000n),
                value: {
                  coins: 2_100_000n,
                  assets: new Map([[GRANT_TOKEN, 1n]]),
                },
              },
              payout(700_000n, SPONSOR_ADDRESS),
            ],
          }),
        ),
      ).toEqual({
        rule: 'account_transaction',
        reason: 'state-nft-name-length',
      });
    });

    it('refuses a control output staked to another credential', () => {
      expect(
        accountViolation(
          sponsoredCreation({
            outputs: [
              {
                ...controlOutput(initialState, 2_100_000n),
                address: otherIdentity.address,
              },
              payout(700_000n, SPONSOR_ADDRESS),
            ],
          }),
        ),
      ).toMatchObject({ reason: 'control-output-stake' });
    });

    it('refuses a creation whose control output does not list device keys in the second field of its datum', () => {
      const missing = {
        rule: 'account_transaction',
        reason: 'control-output-devices',
      };
      for (const datum of [
        initialDatumWith(([logic]) => [logic]),
        initialDatumWith(([logic, , ...rest]) => [logic, 0n, ...rest]),
        initialDatumWith(([logic, , ...rest]) => [
          logic,
          { items: [new Uint8Array(27)] },
          ...rest,
        ]),
        { ...initialDatumWith(fields => fields), constructor: 1n },
      ]) {
        expect(accountViolation(creationWithDatum(datum))).toEqual(missing);
      }
      expect(
        accountViolation(
          sponsoredCreation({
            outputs: [
              {
                ...controlOutput(initialState, 2_100_000n),
                datum: undefined,
                datumHash: '00'.repeat(32) as never,
              },
              payout(700_000n, SPONSOR_ADDRESS),
            ],
          }),
        ),
      ).toEqual(missing);
    });

    it('refuses a creation whose control output lists more devices than a well formed state', () => {
      const devices = Array.from({ length: 9 }, (_, index) =>
        HexBlob(index.toString(16).padStart(2, '0').repeat(28)),
      );
      expect(
        accountViolation(
          creationWithDatum(
            encodeCustodyAccountState({ ...initialState, devices }),
          ),
        ),
      ).toEqual({
        rule: 'account_transaction',
        reason: 'device-count',
        count: 9,
        limit: 8,
      });
    });

    it('accepts a creation whose stake credential is the stake script of the first device its control output lists, or of the last', () => {
      for (const devices of [
        [OWNER_KEY, OTHER_DEVICE_KEY],
        [OTHER_DEVICE_KEY, OWNER_KEY],
      ]) {
        expect(
          violationsOf(
            creationWithDatum(
              encodeCustodyAccountState({ ...initialState, devices }),
            ),
          ),
        ).toEqual([]);
      }
    });

    it('refuses a creation whose stake credential is the stake script of no device the control output lists', () => {
      for (const devices of [[OTHER_DEVICE_KEY], []]) {
        expect(
          accountViolation(
            creationWithDatum(
              encodeCustodyAccountState({ ...initialState, devices }),
            ),
          ),
        ).toEqual({
          rule: 'account_transaction',
          reason: 'underived-stake-credential',
          stakeScriptHash: identity.stakeScriptHash,
        });
      }
    });

    it('refuses a referenced control UTxO of an account no input operates, before anything else and beside a creation', () => {
      const foreignControl = {
        rule: 'account_transaction',
        reason: 'foreign-referenced-control',
        input: outpoint(otherControl),
        stakeScriptHash: otherIdentity.stakeScriptHash,
      };
      expect(
        violationsOf(
          agentSpend({ referenceInputs: [otherControl] }),
          collateralMode(),
        )[0],
      ).toEqual(foreignControl);
      expect(
        violationsOf(sponsoredCreation({ referenceInputs: [otherControl] }))[0],
      ).toEqual(foreignControl);
    });

    it('refuses a grant UTxO spent with its control UTxO neither spent nor referenced', () => {
      const orphan = {
        rule: 'account_transaction',
        reason: 'orphan-grant',
        input: outpoint(grantInput),
        stakeScriptHash: identity.stakeScriptHash,
      };
      expect(
        violationsOf(
          agentSpend({ referenceInputs: undefined }),
          collateralMode(),
        )[0],
      ).toEqual(orphan);
      const referencedGrant = utxo(0x17, grantOutput(otherGrant));
      expect(
        violationsOf(
          agentSpend({ referenceInputs: [referencedGrant] }),
          collateralMode(),
        )[0],
      ).toEqual(orphan);
    });

    it('reads a reference input holding no control token, or one the chain does not know, as no control UTxO', () => {
      const plain = utxo(0x1c, payout(5_000_000n));
      const foreignGrant = utxo(0x1d, {
        address: otherIdentity.address,
        value: {
          coins: 1_500_000n,
          assets: new Map([[custodyGrantAssetId(otherAccount, 0n), 1n]]),
        },
        datum: encodeCustodyGrant(grant),
      });
      const { transaction, resolvedInputs } = buildTransaction(
        agentSpend({ referenceInputs: [grantedControl, plain, foreignGrant] }),
      );
      expect(
        findCustodySponsorRuleViolations(
          hashed(transaction),
          resolvedInputs,
          collateralMode(),
        ),
      ).toEqual([]);
      expect(
        findCustodySponsorRuleViolations(
          hashed(transaction),
          resolvedInputs.filter(
            ([input]) => input.txId !== grantedControl[0].txId,
          ),
          collateralMode(),
        )[0],
      ).toEqual({
        rule: 'account_transaction',
        reason: 'orphan-grant',
        input: outpoint(grantInput),
        stakeScriptHash: identity.stakeScriptHash,
      });
    });

    it('reads a token as an account token only in a positive quantity under the account policy, named after the script its account address is staked to', () => {
      const asGrant = (
        output: Cardano.TxOut,
        seed: number,
      ): TransactionShape => {
        const spent = utxo(seed, output);
        return agentSpend({
          inputs: [spent, fundInput],
          spendRedeemers: [
            withRedeemer(spent, { kind: 'spendWithGrant' }),
            fund(fundInput),
          ],
        });
      };
      const holding = (assetId: Cardano.AssetId, quantity = 1n) => ({
        ...grantOutput(),
        value: { coins: 1_500_000n, assets: new Map([[assetId, quantity]]) },
      });
      const lookalike = holding(
        Cardano.AssetId.fromParts(
          Cardano.PolicyId(FOREIGN_SCRIPT),
          custodyGrantTokenName(identity.stakeScriptHash, grant.slot),
        ),
      );
      const notGrants: Cardano.TxOut[] = [
        {
          ...grantOutput(),
          address: baseAddress(
            keyCredential('ff'.repeat(28)),
            STAKE_CREDENTIAL,
          ),
        },
        {
          ...grantOutput(),
          address: baseAddress(
            scriptCredential(ACCOUNT_VALIDATOR_HASH),
            keyCredential(identity.stakeScriptHash),
          ),
        },
        lookalike,
        holding(
          Cardano.AssetId.fromParts(
            Cardano.PolicyId(ACCOUNT_VALIDATOR_HASH),
            Cardano.AssetName(`${identity.stakeScriptHash}00`),
          ),
        ),
        holding(GRANT_TOKEN, 0n),
      ];
      for (const [index, output] of notGrants.entries()) {
        expect(
          violationsOf(asGrant(output, 0x20 + index), collateralMode())[0],
        ).toEqual({
          rule: 'account_transaction',
          reason: 'foreign-referenced-control',
          input: outpoint(grantedControl),
          stakeScriptHash: identity.stakeScriptHash,
        });
      }
      expect(
        violationOf(
          'account_transaction',
          { ...asGrant(lookalike, 0x18), referenceInputs: undefined },
          collateralMode(),
        ),
      ).toEqual({
        rule: 'account_transaction',
        reason: 'not-account-transaction',
      });
      const misplaced = asGrant(
        { ...grantOutput(), address: otherIdentity.address },
        0x19,
      );
      expect(
        violationsOf(
          { ...misplaced, referenceInputs: [otherControl] },
          collateralMode(),
        )[0],
      ).toEqual({
        rule: 'account_transaction',
        reason: 'foreign-referenced-control',
        input: outpoint(otherControl),
        stakeScriptHash: otherIdentity.stakeScriptHash,
      });
    });

    it('reads a UTxO holding both kinds of account token as the control UTxO', () => {
      const both = utxo(0x1b, {
        ...controlOutput(initialState),
        value: {
          coins: 3_500_000n,
          assets: new Map([
            [GRANT_TOKEN, 1n],
            [NFT, 1n],
          ]),
        },
      });
      expect(
        violationsOf(
          accountPaid({
            inputs: [both, fundInput],
            spendRedeemers: [device(both), fund(fundInput)],
          }),
          collateralMode(),
        ),
      ).toEqual([]);
    });
  });

  describe('known_logic', () => {
    const unknownState: CustodyAccountState = {
      ...initialState,
      logic: HexBlob(UNKNOWN_LOGIC),
    };

    it('refuses a creation whose control output names a logic Lace does not know', () => {
      expect(
        violationOf(
          'known_logic',
          sponsoredCreation({
            outputs: [
              controlOutput(unknownState, 2_100_000n),
              payout(700_000n, SPONSOR_ADDRESS),
            ],
          }),
        ),
      ).toEqual({
        rule: 'known_logic',
        reason: 'unknown-logic',
        control: { kind: 'control-output', outputIndex: 0 },
        logic: UNKNOWN_LOGIC,
        stakeScriptHash: identity.stakeScriptHash,
      });
    });

    it('refuses a control datum that names no logic script hash in its first field', () => {
      const missing = {
        rule: 'known_logic',
        reason: 'logic-missing',
        control: { kind: 'control-output', outputIndex: 0 },
        stakeScriptHash: identity.stakeScriptHash,
      };
      for (const datum of [
        initialDatumWith(([, ...rest]) => [new Uint8Array(27), ...rest]),
        initialDatumWith(([, ...rest]) => [0n, ...rest]),
        initialDatumWith(() => []),
      ]) {
        expect(violationOf('known_logic', creationWithDatum(datum))).toEqual(
          missing,
        );
      }
    });

    it('refuses a spent control UTxO naming a logic Lace does not know, before the control output', () => {
      const unknownControl = utxo(0x10, controlOutput(unknownState));
      expect(
        violationOf(
          'known_logic',
          accountPaid({
            inputs: [unknownControl, fundInput],
            spendRedeemers: [device(unknownControl), fund(fundInput)],
            outputs: [controlOutput(unknownState), fundOutput(9_800_000n)],
          }),
          collateralMode(),
        ),
      ).toEqual({
        rule: 'known_logic',
        reason: 'unknown-logic',
        control: { kind: 'control-utxo', input: outpoint(unknownControl) },
        logic: UNKNOWN_LOGIC,
        stakeScriptHash: identity.stakeScriptHash,
      });
    });

    it('refuses a referenced control UTxO naming a logic Lace does not know', () => {
      const unknownControl = utxo(
        0x12,
        controlOutput({ ...grantedState, logic: HexBlob(UNKNOWN_LOGIC) }),
      );
      expect(
        violationOf(
          'known_logic',
          agentSpend({ referenceInputs: [unknownControl] }),
          collateralMode(),
        ),
      ).toEqual({
        rule: 'known_logic',
        reason: 'unknown-logic',
        control: { kind: 'control-utxo', input: outpoint(unknownControl) },
        logic: UNKNOWN_LOGIC,
        stakeScriptHash: identity.stakeScriptHash,
      });
    });

    it('reads no logic off an output that holds no state NFT named after the script it is staked to', () => {
      const unknownDatum = encodeCustodyAccountState(unknownState);
      for (const output of [
        { ...fundOutput(9_800_000n), datum: unknownDatum },
        {
          ...controlOutput(unknownState),
          address: baseAddress(
            scriptCredential(ACCOUNT_VALIDATOR_HASH),
            keyCredential(identity.stakeScriptHash),
          ),
        },
      ]) {
        expect(
          violationOf(
            'known_logic',
            accountPaid({ outputs: [controlOutput(initialState), output] }),
            collateralMode(),
          ),
        ).toBeUndefined();
      }
    });
  });

  describe('sponsor_outflow_bounded', () => {
    const outflowViolation = (
      overrides: Partial<TransactionShape>,
      mode: Partial<
        Extract<CustodySponsorRuleContext['mode'], { kind: 'fee' }>
      > = {},
    ) =>
      violationOf(
        'sponsor_outflow_bounded',
        sponsoredCreation(overrides),
        context({
          mode: { ...feeMode, ...mode } as CustodySponsorRuleContext['mode'],
        }),
      );

    it("refuses a fee above the service's fee limit before reading the draw", () => {
      expect(outflowViolation({ fee: 2_000_001n })).toEqual({
        rule: 'sponsor_outflow_bounded',
        reason: 'fee-exceeds-limit',
        fee: 2_000_001n,
        limit: 2_000_000n,
      });
      expect(outflowViolation({ fee: 2_000_000n })).toMatchObject({
        reason: 'draw-mismatch',
      });
    });

    it('refuses sponsor change carrying a datum or a reference script', () => {
      const control2 = controlOutput(initialState, 2_100_000n);
      expect(
        outflowViolation({
          outputs: [
            control2,
            {
              ...payout(700_000n, SPONSOR_ADDRESS),
              datumHash: '00'.repeat(32) as never,
            },
          ],
        }),
      ).toEqual({
        rule: 'sponsor_outflow_bounded',
        reason: 'sponsor-output-datum',
        outputIndex: 1,
      });
      expect(
        outflowViolation({
          outputs: [
            control2,
            {
              ...payout(700_000n, SPONSOR_ADDRESS),
              scriptReference: identity.stakeScript,
            },
          ],
        }),
      ).toMatchObject({ reason: 'sponsor-output-reference-script' });
    });

    it('refuses anything but exactly one sponsor change output', () => {
      expect(
        outflowViolation({
          outputs: [
            controlOutput(initialState, 2_100_000n),
            payout(350_000n, SPONSOR_ADDRESS),
            payout(350_000n, SPONSOR_ADDRESS),
          ],
        }),
      ).toEqual({
        rule: 'sponsor_outflow_bounded',
        reason: 'sponsor-output-count',
        count: 2,
      });
    });

    it('refuses a draw other than the fee, deposit and control output', () => {
      expect(
        outflowViolation({
          outputs: [
            controlOutput(initialState, 2_100_000n),
            payout(600_000n, SPONSOR_ADDRESS),
            payout(100_000n, STRANGER_ADDRESS),
          ],
        }),
      ).toEqual({
        rule: 'sponsor_outflow_bounded',
        reason: 'draw-mismatch',
        sponsored: 4_400_000n,
        expected: 4_300_000n,
      });
    });

    it('refuses an owner operation and an agent spend, whatever they draw, since the fee UTxO pays for a creation only', () => {
      const notCreation = {
        rule: 'sponsor_outflow_bounded',
        reason: 'not-creation',
      };
      expect(
        violationsOf(
          accountPaid({
            inputs: [control, fundInput, sponsorFee],
            outputs: [
              controlOutput(initialState),
              fundOutput(10_000_000n),
              payout(4_800_000n, SPONSOR_ADDRESS),
            ],
          }),
        ),
      ).toEqual([notCreation]);
      expect(
        violationsOf(
          agentSpend({
            inputs: [grantInput, fundInput, sponsorFee],
            outputs: [
              grantOutput(),
              payout(2_000_000n),
              fundOutput(8_000_000n),
              payout(4_800_000n, SPONSOR_ADDRESS),
            ],
          }),
        ),
      ).toEqual([notCreation]);
    });

    it('refuses an operation before checking its fee and its draw against the limits', () => {
      expect(
        violationOf(
          'sponsor_outflow_bounded',
          accountPaid({
            inputs: [control, fundInput, sponsorFee],
            outputs: [
              controlOutput(initialState),
              fundOutput(10_000_000n),
              payout(4_800_000n, SPONSOR_ADDRESS),
            ],
            fee: 2_000_001n,
          }),
          context({
            mode: {
              ...feeMode,
              maxSponsoredLovelace: 100_000n,
            } as CustodySponsorRuleContext['mode'],
          }),
        ),
      ).toEqual({ rule: 'sponsor_outflow_bounded', reason: 'not-creation' });
    });

    it('refuses a draw over the sponsored limit', () => {
      expect(
        outflowViolation({}, { maxSponsoredLovelace: 4_000_000n }),
      ).toEqual({
        rule: 'sponsor_outflow_bounded',
        reason: 'draw-exceeds-limit',
        sponsored: 4_300_000n,
        limit: 4_000_000n,
      });
    });
  });

  describe('sponsor_outflow_zero', () => {
    it('refuses an output to the sponsor key in collateral mode', () => {
      expect(
        violationsOf(
          accountPaid({
            outputs: [
              controlOutput(initialState),
              fundOutput(8_800_000n),
              payout(1_000_000n, enterpriseAddress(keyCredential(SPONSOR_KEY))),
            ],
          }),
          collateralMode(),
        )[0],
      ).toEqual({
        rule: 'sponsor_outflow_zero',
        reason: 'pays-sponsor',
        outputIndex: 2,
      });
    });

    it('refuses a withdrawal from the sponsor reward account in collateral mode', () => {
      expect(
        violationsOf(
          accountPaid({
            collateralReturn: payout(4_700_000n, SPONSOR_BASE_ADDRESS),
            withdrawals: [
              logicRun,
              { stakeAddress: SPONSOR_REWARD_ACCOUNT, quantity: 0n },
            ],
          }),
          collateralMode({ sponsorAddress: SPONSOR_BASE_ADDRESS }),
        ),
      ).toEqual([
        {
          rule: 'sponsor_outflow_zero',
          reason: 'sponsor-withdrawal',
          rewardAccount: SPONSOR_REWARD_ACCOUNT,
        },
        {
          rule: 'signers',
          reason: 'sponsor-withdrawal',
          rewardAccount: SPONSOR_REWARD_ACCOUNT,
        },
      ]);
    });

    it('reads a sponsor address without key credentials as no sponsor key', () => {
      const scriptSponsor = enterpriseAddress(scriptCredential(FOREIGN_SCRIPT));
      expect(
        violationsOf(
          accountPaid({
            collateralReturn: payout(4_700_000n, scriptSponsor),
            withdrawals: [
              logicRun,
              { stakeAddress: STRANGER_REWARD_ACCOUNT, quantity: 0n },
            ],
          }),
          collateralMode({ sponsorAddress: scriptSponsor }),
        ),
      ).toEqual([]);
    });
  });

  describe('no_sponsor_value_elsewhere', () => {
    it('refuses outputs away from the sponsor and the account that the sponsor would fund', () => {
      expect(
        violationOf(
          'no_sponsor_value_elsewhere',
          accountPaid({
            inputs: [control, sponsorFee],
            spendRedeemers: [device(control)],
            outputs: [controlOutput(initialState), payout(4_800_000n)],
          }),
        ),
      ).toEqual({
        rule: 'no_sponsor_value_elsewhere',
        reason: 'uncovered-outflow',
        demanded: 4_800_000n,
        supplied: 2_000_000n,
      });
    });

    it('names the asset an outside output takes from the sponsor', () => {
      const tokenFee = utxo(0xf0, {
        address: SPONSOR_ADDRESS,
        value: { coins: 5_000_000n, assets: new Map([[TOKEN, 5n]]) },
      });
      expect(
        violationOf(
          'no_sponsor_value_elsewhere',
          accountPaid({
            inputs: [control, fundInput, tokenFee],
            outputs: [
              controlOutput(initialState),
              fundOutput(9_000_000n),
              {
                address: STRANGER_ADDRESS,
                value: { coins: 1_000_000n, assets: new Map([[TOKEN, 5n]]) },
              },
              payout(4_800_000n, SPONSOR_ADDRESS),
            ],
          }),
          context({
            mode: {
              ...feeMode,
              feeUtxo: tokenFee,
            } as CustodySponsorRuleContext['mode'],
          }),
        ),
      ).toEqual({
        rule: 'no_sponsor_value_elsewhere',
        reason: 'uncovered-outflow',
        assetId: TOKEN,
        demanded: 5n,
        supplied: 0n,
      });
    });

    it('counts withdrawals that are not the sponsor as supply', () => {
      expect(
        violationOf(
          'no_sponsor_value_elsewhere',
          accountPaid({
            outputs: [
              controlOutput(initialState),
              fundOutput(9_800_000n),
              payout(2_000_000n),
            ],
            withdrawals: [
              logicRun,
              { stakeAddress: identity.rewardAccount, quantity: 2_000_000n },
            ],
          }),
          collateralMode(),
        ),
      ).toBeUndefined();
    });

    it('never counts a withdrawal from the sponsor as supply', () => {
      expect(
        violationOf(
          'no_sponsor_value_elsewhere',
          accountPaid({
            inputs: [control],
            spendRedeemers: [device(control)],
            outputs: [controlOutput(initialState), payout(3_000_000n)],
            withdrawals: [
              { stakeAddress: SPONSOR_REWARD_ACCOUNT, quantity: 1_000_000n },
            ],
          }),
          collateralMode({ sponsorAddress: SPONSOR_BASE_ADDRESS }),
        ),
      ).toMatchObject({ demanded: 3_000_000n, supplied: 2_000_000n });
    });
  });

  describe('no_foreign_scripts', () => {
    const foreignViolation = (
      overrides: Partial<TransactionShape>,
      ruleContext = collateralMode(),
    ): CustodySponsorRuleViolation | undefined =>
      violationOf('no_foreign_scripts', accountPaid(overrides), ruleContext);

    it('accepts the stake script of the spent control UTxO', () => {
      expect(
        foreignViolation({
          certificates: [
            {
              __typename: Cardano.CertificateType.StakeDelegation,
              stakeCredential: STAKE_CREDENTIAL,
              poolId: POOL_ID,
            },
          ],
          scripts: [
            VERSION.accountValidator,
            LOGIC.script,
            identity.stakeScript,
          ],
        }),
      ).toBeUndefined();
    });

    it('takes the stake script of the account whose control UTxO is referenced, and no other', () => {
      const withdrawingFrom = (rewardAccount: Cardano.RewardAccount) =>
        violationsOf(
          agentSpend({
            withdrawals: [
              logicRun,
              { stakeAddress: rewardAccount, quantity: 0n },
            ],
            scripts: [
              VERSION.accountValidator,
              LOGIC.script,
              identity.stakeScript,
            ],
          }),
          collateralMode(),
        );
      expect(withdrawingFrom(identity.rewardAccount)).toEqual([]);
      expect(withdrawingFrom(otherIdentity.rewardAccount)).toEqual([
        {
          rule: 'no_foreign_scripts',
          reason: 'foreign-withdrawal',
          rewardAccount: otherIdentity.rewardAccount,
        },
      ]);
    });

    it('takes no stake script from a grant UTxO alone', () => {
      expect(
        violationOf(
          'no_foreign_scripts',
          agentSpend({
            referenceInputs: undefined,
            withdrawals: [
              { stakeAddress: identity.rewardAccount, quantity: 0n },
            ],
            scripts: [VERSION.accountValidator],
          }),
          collateralMode(),
        ),
      ).toEqual({
        rule: 'no_foreign_scripts',
        reason: 'foreign-withdrawal',
        rewardAccount: identity.rewardAccount,
      });
    });

    it('refuses an input locked by any script but the proxy, the stake script included', () => {
      for (const scriptHash of [FOREIGN_SCRIPT, identity.stakeScriptHash]) {
        const locked = utxo(
          0x30,
          payout(2_000_000n, enterpriseAddress(scriptCredential(scriptHash))),
        );
        expect(
          foreignViolation({ inputs: [control, fundInput, locked] }),
        ).toEqual({
          rule: 'no_foreign_scripts',
          reason: 'foreign-script-input',
          input: outpoint(locked),
          scriptHash,
        });
      }
    });

    it('refuses a mint under any policy but the proxy, the stake script included', () => {
      expect(foreignViolation({ mint: new Map([[TOKEN, 1n]]) })).toEqual({
        rule: 'no_foreign_scripts',
        reason: 'foreign-mint',
        policyId: '99'.repeat(28),
      });
      const stakeToken = Cardano.AssetId.fromParts(
        Cardano.PolicyId(identity.stakeScriptHash),
        Cardano.AssetName('00'),
      );
      expect(foreignViolation({ mint: new Map([[stakeToken, 1n]]) })).toEqual({
        rule: 'no_foreign_scripts',
        reason: 'foreign-mint',
        policyId: identity.stakeScriptHash,
      });
    });

    it('refuses a certificate naming another script, the logic included, whatever its kind', () => {
      const foreign = scriptCredential(FOREIGN_SCRIPT);
      const certificates: Cardano.Certificate[] = [
        {
          __typename: Cardano.CertificateType.VoteDelegation,
          stakeCredential: STAKE_CREDENTIAL,
          dRep: foreign,
        },
        {
          __typename: Cardano.CertificateType.RegisterDelegateRepresentative,
          dRepCredential: foreign,
          deposit: 1n,
          anchor: null,
        },
        {
          __typename: Cardano.CertificateType.AuthorizeCommitteeHot,
          coldCredential: keyCredential('c0'.repeat(28)),
          hotCredential: foreign,
        },
        {
          __typename: Cardano.CertificateType.ResignCommitteeCold,
          coldCredential: foreign,
          anchor: null,
        },
      ];
      for (const certificate of certificates) {
        expect(foreignViolation({ certificates: [certificate] })).toEqual({
          rule: 'no_foreign_scripts',
          reason: 'foreign-certificate',
          certificateIndex: 0,
          scriptHash: FOREIGN_SCRIPT,
        });
      }
      expect(
        foreignViolation({
          certificates: [
            {
              __typename: Cardano.CertificateType.Registration,
              stakeCredential: scriptCredential(LOGIC.hash),
              deposit: 2_000_000n,
            },
          ],
        }),
      ).toEqual({
        rule: 'no_foreign_scripts',
        reason: 'foreign-certificate',
        certificateIndex: 0,
        scriptHash: LOGIC.hash,
      });
    });

    it('reads a vote delegation to a predefined DRep as naming no DRep credential', () => {
      expect(
        foreignViolation({
          certificates: [
            {
              __typename: Cardano.CertificateType.VoteDelegation,
              stakeCredential: STAKE_CREDENTIAL,
              dRep: { __typename: 'AlwaysAbstain' },
            },
          ],
        }),
      ).toBeUndefined();
    });

    it('refuses a withdrawal from another script, a logic no control datum names included', () => {
      for (const rewardAccount of [
        FOREIGN_REWARD_ACCOUNT,
        UNKNOWN_LOGIC_REWARD_ACCOUNT,
      ]) {
        expect(
          foreignViolation({
            withdrawals: [
              logicRun,
              { stakeAddress: rewardAccount, quantity: 0n },
            ],
          }),
        ).toEqual({
          rule: 'no_foreign_scripts',
          reason: 'foreign-withdrawal',
          rewardAccount,
        });
      }
    });

    it('takes a withdrawal from a logic a control datum names, even one Lace does not know, leaving it to known_logic', () => {
      const unknownState = { ...initialState, logic: HexBlob(UNKNOWN_LOGIC) };
      expect(
        foreignViolation({
          outputs: [controlOutput(unknownState), fundOutput(9_800_000n)],
          withdrawals: [
            logicRun,
            { stakeAddress: UNKNOWN_LOGIC_REWARD_ACCOUNT, quantity: 0n },
          ],
        }),
      ).toBeUndefined();
    });

    it('refuses a logic withdrawal that draws lovelace, as the service does', () => {
      expect(
        foreignViolation({
          withdrawals: [{ stakeAddress: LOGIC_REWARD_ACCOUNT, quantity: 1n }],
        }),
      ).toEqual({
        rule: 'no_foreign_scripts',
        reason: 'logic-draw',
        rewardAccount: LOGIC_REWARD_ACCOUNT,
        logic: LOGIC.hash,
        quantity: 1n,
      });
    });

    describe('withdrawal maps as the body states them', () => {
      const logicEntry = `581d${Cardano.Address.fromBech32(
        LOGIC_REWARD_ACCOUNT,
      ).toBytes()}00`;
      /** The transaction with its one-entry withdrawal map stated as `map`. */
      const restating =
        (map: string) =>
        (transaction: Built): Built => {
          const cbor = transaction.toCbor();
          expect(cbor).toContain(`05a1${logicEntry}`);
          return Serialization.Transaction.fromCbor(
            Serialization.TxCBOR(cbor.replace(`05a1${logicEntry}`, `05${map}`)),
          );
        };

      it('refuses a withdrawal map that draws from the same reward account twice', () => {
        for (const map of [
          `a2${logicEntry}${logicEntry}`,
          `bf${logicEntry}${logicEntry}ff`,
        ]) {
          expect(
            violationOf(
              'no_foreign_scripts',
              accountPaid(),
              collateralMode(),
              restating(map),
            ),
          ).toEqual({
            rule: 'no_foreign_scripts',
            reason: 'duplicate-withdrawal',
            rewardAccount: LOGIC_REWARD_ACCOUNT,
          });
        }
      });

      it('reads a withdrawal map of indefinite length', () => {
        expect(
          violationsOf(
            accountPaid(),
            collateralMode(),
            restating(`bf${logicEntry}ff`),
          ),
        ).toEqual([]);
      });
    });

    it('refuses a script voter', () => {
      expect(
        foreignViolation({
          body: {
            totalCollateral: 300_000n,
            votingProcedures: [
              {
                voter: {
                  __typename: Cardano.VoterType.dRepScriptHash,
                  credential: {
                    type: Cardano.CredentialType.ScriptHash,
                    hash: Hash28ByteBase16(FOREIGN_SCRIPT),
                  },
                },
                votes: [vote],
              },
            ],
          },
        }),
      ).toEqual({
        rule: 'no_foreign_scripts',
        reason: 'foreign-voter',
        scriptHash: FOREIGN_SCRIPT,
      });
    });

    it('refuses native scripts and other attached scripts', () => {
      expect(
        foreignViolation({
          scripts: [
            VERSION.accountValidator,
            LOGIC.script,
            {
              __type: Cardano.ScriptType.Native,
              kind: Cardano.NativeScriptKind.RequireAnyOf,
              scripts: [],
            },
          ],
        }),
      ).toEqual({ rule: 'no_foreign_scripts', reason: 'native-script' });
      expect(
        foreignViolation({
          scripts: [
            VERSION.accountValidator,
            LOGIC.script,
            otherIdentity.stakeScript,
          ],
        }),
      ).toEqual({
        rule: 'no_foreign_scripts',
        reason: 'foreign-attached-script',
        scriptHash: otherIdentity.stakeScriptHash,
      });
    });

    it('refuses an attached logic no control datum names', () => {
      const unnamed: Cardano.PlutusScript = {
        ...LOGIC.script,
        bytes: HexBlob(`${LOGIC.script.bytes}00`),
      };
      expect(
        foreignViolation({
          scripts: [VERSION.accountValidator, unnamed],
        }),
      ).toEqual({
        rule: 'no_foreign_scripts',
        reason: 'foreign-attached-script',
        scriptHash: Serialization.Script.fromCore(unnamed).hash(),
      });
    });

    describe('reference scripts, beyond the service', () => {
      const referencing = (...referenceInputs: Cardano.Utxo[]) =>
        foreignViolation({
          referenceInputs,
          scripts: undefined,
        });
      const relocated = (
        [input, output]: Cardano.Utxo,
        script?: Cardano.PlutusScript,
      ): Cardano.Utxo => [input, { ...output, scriptReference: script }];

      it("accepts each of the version's parked scripts where it is parked", () => {
        expect(referencing(parkedProxy, parkedLogic)).toBeUndefined();
        expect(referencing(parkedLogic)).toBeUndefined();
      });

      it('refuses a script referenced anywhere but where the version parked it', () => {
        const elsewhere = utxo(0x40, {
          ...parkedProxy[1],
          address: STRANGER_ADDRESS,
        });
        expect(referencing(elsewhere)).toEqual({
          rule: 'no_foreign_scripts',
          reason: 'foreign-reference-script',
          input: outpoint(elsewhere),
          scriptHash: VERSION.accountValidatorHash,
        });
      });

      it('refuses a parked script UTxO carrying another script, or none', () => {
        expect(referencing(relocated(parkedProxy, LOGIC.script))).toEqual({
          rule: 'no_foreign_scripts',
          reason: 'foreign-reference-script',
          input: outpoint(parkedProxy),
          scriptHash: LOGIC.hash,
        });
        expect(referencing(relocated(parkedLogic))).toEqual({
          rule: 'no_foreign_scripts',
          reason: 'foreign-reference-script',
          input: outpoint(parkedLogic),
        });
      });

      it('accepts no parked script on a network the version parked none on', () => {
        expect(
          foreignViolation(
            { referenceInputs: [parkedProxy], scripts: undefined },
            collateralMode({ networkMagic: Cardano.NetworkMagics.Mainnet }),
          ),
        ).toEqual({
          rule: 'no_foreign_scripts',
          reason: 'foreign-reference-script',
          input: outpoint(parkedProxy),
          scriptHash: VERSION.accountValidatorHash,
        });
      });

      it('reads a reference input the caller resolved no output for as carrying no script', () => {
        const { transaction, resolvedInputs } = buildTransaction(
          accountPaid({ referenceInputs: [parkedProxy] }),
        );
        expect(
          findCustodySponsorRuleViolations(
            hashed(transaction),
            resolvedInputs.filter(
              ([input]) => input.txId !== parkedProxy[0].txId,
            ),
            collateralMode(),
          ),
        ).toEqual([]);
      });
    });
  });

  describe('script_data_hash', () => {
    const plutusV2: Cardano.PlutusScript = {
      ...otherIdentity.stakeScript,
      version: Cardano.PlutusLanguageVersion.V2,
    };

    it('refuses a body committing to script data other than the witness set carries', () => {
      const declared = 'ab'.repeat(32) as Hash32ByteBase16;
      const { transaction } = buildTransaction(accountPaid());
      expect(
        violationOf(
          'script_data_hash',
          accountPaid(),
          collateralMode(),
          committing(declared),
        ),
      ).toEqual({
        rule: 'script_data_hash',
        reason: 'script-data-hash-mismatch',
        declared,
        computed: scriptDataHashOf(transaction),
      });
    });

    it('refuses a body committing to no script data hash while the witness set carries redeemers', () => {
      expect(
        violationOf(
          'script_data_hash',
          accountPaid(),
          collateralMode(),
          committing(undefined),
        ),
      ).toEqual({
        rule: 'script_data_hash',
        reason: 'missing-script-data-hash',
      });
    });

    it('refuses a body committing to a script data hash while the witness set carries neither redeemers nor datums', () => {
      const declared = 'ab'.repeat(32) as Hash32ByteBase16;
      expect(
        violationOf(
          'script_data_hash',
          accountPaid({ spendRedeemers: undefined }),
          collateralMode(),
          committing(declared),
        ),
      ).toEqual({
        rule: 'script_data_hash',
        reason: 'unexpected-script-data-hash',
        declared,
      });
    });

    it('hashes the datums a witness set carries, with an empty redeemer map standing in for no redeemers', () => {
      const { transaction, resolvedInputs } = buildTransaction(
        accountPaid({ spendRedeemers: undefined }),
      );
      const core = transaction.toCore();
      const withDatum = Serialization.Transaction.fromCbor(
        Serialization.Transaction.fromCore({
          ...core,
          witness: { ...core.witness, datums: [42n] },
        }).toCbor(),
      );
      const datums = withDatum.witnessSet().plutusData()?.toCbor();
      const expected = blake2b.hash<Hash32ByteBase16>(
        HexBlob(`a0${datums}${V3_LANGUAGE_VIEW}`),
        32,
      );
      const violationsUnder = (hash: Hash32ByteBase16) =>
        findCustodySponsorRuleViolations(
          committing(hash)(withDatum),
          resolvedInputs,
          collateralMode(),
        );
      expect(violationsUnder(expected)).toEqual([]);
      expect(violationsUnder('ab'.repeat(32) as Hash32ByteBase16)).toEqual([
        {
          rule: 'script_data_hash',
          reason: 'script-data-hash-mismatch',
          declared: 'ab'.repeat(32),
          computed: expected,
        },
      ]);
    });

    it('takes the language view of the reference scripts the inputs and reference inputs carry, not only of the attached scripts', () => {
      const declared = scriptDataHashOf(
        buildTransaction(accountPaid({ scripts: undefined })).transaction,
      );
      expect(
        violationOf(
          'script_data_hash',
          accountPaid({
            referenceInputs: [parkedProxy, parkedLogic],
            scripts: undefined,
          }),
          collateralMode(),
          committing(declared),
        ),
      ).toBeUndefined();
      expect(
        violationOf(
          'script_data_hash',
          accountPaid({ scripts: undefined }),
          collateralMode(),
        ),
      ).toMatchObject({ reason: 'script-data-hash-mismatch' });
    });

    it('refuses a script of another Plutus language, attached, spent with or referenced', () => {
      const nonV3 = {
        rule: 'script_data_hash',
        reason: 'non-v3-script',
        language: Cardano.PlutusLanguageVersion.V2,
      };
      expect(
        violationOf(
          'script_data_hash',
          accountPaid({
            scripts: [VERSION.accountValidator, LOGIC.script, plutusV2],
          }),
          collateralMode(),
        ),
      ).toEqual(nonV3);
      const carrying = utxo(0x41, {
        ...fundOutput(10_000_000n),
        scriptReference: plutusV2,
      });
      expect(
        violationOf(
          'script_data_hash',
          accountPaid({
            inputs: [control, carrying],
            spendRedeemers: [device(control), fund(carrying)],
          }),
          collateralMode(),
        ),
      ).toEqual(nonV3);
      expect(
        violationOf(
          'script_data_hash',
          accountPaid({ referenceInputs: [utxo(0x42, payout(1n))] }),
          collateralMode(),
        ),
      ).toBeUndefined();
      expect(
        violationOf(
          'script_data_hash',
          accountPaid({
            referenceInputs: [
              utxo(0x42, { ...payout(1n), scriptReference: plutusV2 }),
            ],
          }),
          collateralMode(),
        ),
      ).toEqual(nonV3);
    });

    it('refuses script data it cannot hash for want of a Plutus V3 cost model', () => {
      expect(
        violationOf(
          'script_data_hash',
          accountPaid(),
          collateralMode({ costModels: new Map() }),
        ),
      ).toEqual({
        rule: 'script_data_hash',
        reason: 'missing-cost-model',
        language: Cardano.PlutusLanguageVersion.V3,
      });
    });

    it('builds the language view from the cost models it is given', () => {
      expect(
        violationOf(
          'script_data_hash',
          accountPaid(),
          collateralMode({
            costModels: new Map([[Cardano.PlutusLanguageVersion.V3, [1, 2]]]),
          }),
        ),
      ).toMatchObject({ reason: 'script-data-hash-mismatch' });
    });
  });

  describe('signers', () => {
    const signerViolation = (
      overrides: Partial<TransactionShape>,
    ): CustodySponsorRuleViolation | undefined =>
      violationOf(
        'signers',
        accountPaid(overrides),
        context({ sponsorAddress: SPONSOR_BASE_ADDRESS }),
      );

    it('refuses either sponsor key as a required signer', () => {
      for (const keyHash of [SPONSOR_KEY, SPONSOR_STAKE_KEY]) {
        expect(signerViolation({ requiredSigners: [keyHash] })).toEqual({
          rule: 'signers',
          reason: 'sponsor-required-signer',
          keyHash,
        });
      }
    });

    it('refuses a certificate naming a sponsor credential', () => {
      const certificates: Cardano.Certificate[] = [
        {
          __typename: Cardano.CertificateType.StakeDelegation,
          stakeCredential: keyCredential(SPONSOR_STAKE_KEY),
          poolId: POOL_ID,
        },
        {
          __typename: Cardano.CertificateType.PoolRetirement,
          poolId: Cardano.PoolId.fromKeyHash(SPONSOR_KEY as never),
          epoch: Cardano.EpochNo(1),
        },
        {
          __typename: Cardano.CertificateType.PoolRegistration,
          poolParameters: {
            id: POOL_ID,
            rewardAccount: STRANGER_REWARD_ACCOUNT,
            pledge: 0n,
            cost: 0n,
            margin: { numerator: 0, denominator: 1 },
            relays: [],
            owners: [SPONSOR_REWARD_ACCOUNT],
            vrf: '00'.repeat(32) as never,
          },
        },
      ];
      for (const certificate of certificates) {
        expect(signerViolation({ certificates: [certificate] })).toEqual({
          rule: 'signers',
          reason: 'sponsor-certificate',
          certificateIndex: 0,
        });
      }
    });

    it('refuses a sponsor voter', () => {
      expect(
        signerViolation({
          body: {
            totalCollateral: 300_000n,
            votingProcedures: [
              {
                voter: {
                  __typename: Cardano.VoterType.stakePoolKeyHash,
                  credential: {
                    type: Cardano.CredentialType.KeyHash,
                    hash: Hash28ByteBase16(SPONSOR_KEY),
                  },
                },
                votes: [vote],
              },
            ],
          },
        }),
      ).toEqual({ rule: 'signers', reason: 'sponsor-voter' });
    });

    it('ignores withdrawals, certificates and voters of other credentials', () => {
      expect(
        signerViolation({
          withdrawals: [
            logicRun,
            { stakeAddress: STRANGER_REWARD_ACCOUNT, quantity: 0n },
          ],
          certificates: [
            {
              __typename: Cardano.CertificateType.StakeDelegation,
              stakeCredential: keyCredential('c0'.repeat(28)),
              poolId: POOL_ID,
            },
          ],
          body: {
            totalCollateral: 300_000n,
            votingProcedures: [
              {
                voter: {
                  __typename: Cardano.VoterType.stakePoolKeyHash,
                  credential: {
                    type: Cardano.CredentialType.KeyHash,
                    hash: Hash28ByteBase16('c0'.repeat(28)),
                  },
                },
                votes: [vote],
              },
            ],
          },
        }),
      ).toBeUndefined();
    });
  });
});
