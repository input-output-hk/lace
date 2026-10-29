import { Cardano } from '@cardano-sdk/core';
import {
  Ed25519KeyHashHex,
  Hash28ByteBase16,
  Hash32ByteBase16,
} from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  CUSTODY_MAX_GRANT_BATCH,
  CUSTODY_MAX_GRANTS,
  custodyGrantAssetId,
  encodeCustodyAccountState,
} from '@lace-lib/cardano-custody';
import { describe, expect, it } from 'vitest';

import {
  checkCardanoCustodySignRequest,
  checkOrdinaryCardanoTransaction,
  parseCardanoCustodyChainId,
} from '../../src/signing/custody-sign-request';
import { MalformedRequestError } from '../../src/signing/request-parsing';

import {
  AGENT_KEY,
  agentGrant,
  control,
  controlOutput,
  creation,
  custodyPayload,
  DEVICE_0,
  DEVICE_1,
  deviceRewrite,
  fundUtxo,
  GRANT_LOVELACE,
  grantedState,
  grantOutput,
  grantUtxo,
  identity,
  initialState,
  issueGrant,
  logicRun,
  NOW,
  PARKED_SCRIPTS,
  payout,
  record,
  replaceGrant,
  requestedScopeOf,
  revokedState,
  revokeGrant,
  serializeCustodyTransaction,
  serializeResolvedInput,
  STRANGER_ADDRESS,
  successorGrant,
  sweepGrants,
  TESTNET_CUSTODY_XPUB,
  utxo,
} from './custody-sign-request.fixtures';

import type { CustodyTransactionShape } from './custody-sign-request.fixtures';
import type { CustodyGrant } from '@lace-lib/cardano-custody';

const STRANGER_KEY_HASH = Hash28ByteBase16('ff'.repeat(28));

const check = async (payload: unknown) =>
  checkCardanoCustodySignRequest(payload, { now: NOW });

const refusalOf = async (payload: unknown): Promise<unknown> =>
  check(payload).then(
    () => {
      throw new Error('Expected the request to be refused.');
    },
    (error: unknown) => error,
  );

const thrownBy = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected a refusal.');
};

const expectMalformed = async (payload: unknown, field: string) => {
  const error = await refusalOf(payload);
  expect(error).toBeInstanceOf(MalformedRequestError);
  expect((error as Error).message).toContain(`"${field}"`);
};

const expectRefused = async (
  payload: unknown,
  code: string,
  reason: string,
) => {
  const error = await refusalOf(payload);
  expect(error).toBeInstanceOf(Error);
  expect(error).toMatchObject({
    name: 'CardanoCustodyRequestRefusedError',
    code,
    reason,
  });
};

describe('parseCardanoCustodyChainId', () => {
  it.each([
    Cardano.ChainIds.Mainnet,
    Cardano.ChainIds.Preprod,
    Cardano.ChainIds.Preview,
  ])('reads a supported chain %o', chainId => {
    expect(parseCardanoCustodyChainId(chainId)).toEqual(chainId);
  });

  it.each([
    [
      'a testnet id with the mainnet magic',
      { networkId: 0, networkMagic: 764_824_073 },
    ],
    ['the mainnet id with a testnet magic', { networkId: 1, networkMagic: 1 }],
    [
      'a network with no slot configuration',
      { networkId: 0, networkMagic: 42 },
    ],
    ['no chain id', undefined],
  ])('refuses %s as malformed', (_, chainId) => {
    expect(() => parseCardanoCustodyChainId(chainId)).toThrow(
      MalformedRequestError,
    );
  });
});

describe('checkCardanoCustodySignRequest', () => {
  it('reads a sponsored creation signed by the creator device', async () => {
    const checked = await check(custodyPayload(creation()));

    expect(checked.device).toEqual({
      extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
      index: 0,
      keyHash: DEVICE_0,
    });
    expect(checked.identity.stakeScriptHash).toBe(identity.stakeScriptHash);
    expect(checked.account.operations).toEqual([{ kind: 'create' }]);
    expect(checked.txId).toBe(checked.transaction.getId());
    expect(checked.requestedScopes).toBeUndefined();
  });

  it('reads an owner operation paid from the account, with the declared grant', async () => {
    const checked = await check(
      custodyPayload(issueGrant(), {
        requestedScopes: [requestedScopeOf(agentGrant)],
      }),
    );

    expect(checked.account.operations).toEqual([
      { kind: 'issue-grant', slot: 0n },
    ]);
    expect(checked.requestedScopes).toHaveLength(1);
  });

  it('accepts an upper-case device key and reports it in lower case', async () => {
    const checked = await check(
      custodyPayload(creation(), {
        device: {
          extendedAccountPublicKey: TESTNET_CUSTODY_XPUB.toUpperCase(),
          index: 0,
        },
      }),
    );

    expect(checked.device.extendedAccountPublicKey).toBe(TESTNET_CUSTODY_XPUB);
  });

  describe('malformed requests', () => {
    it('refuses a payload that is not an object', async () => {
      await expectMalformed(null, 'payload');
      await expectMalformed([], 'payload');
    });

    it.each(['', 'not-cbor', 42, undefined])(
      'refuses the transaction %s',
      async serializedTx => {
        await expectMalformed(
          custodyPayload(creation(), { serializedTx }),
          'serializedTx',
        );
      },
    );

    it.each([
      ['not an array', 'aa'],
      ['an entry that is not hex', ['zz']],
      ['an entry that is not an unspent output', ['8200']],
      ['an entry that is not text', [{ txId: 'aa' }]],
    ])('refuses resolutions that are %s', async (_, resolvedInputs) => {
      await expectMalformed(
        custodyPayload(creation(), { resolvedInputs }),
        'resolvedInputs',
      );
    });

    it('refuses a resolution with bytes after the unspent output, which has two readings', async () => {
      const payload = custodyPayload(creation());
      await expectMalformed(
        {
          ...payload,
          resolvedInputs: payload.resolvedInputs.map(
            (resolution: string) => `${resolution}00`,
          ),
        },
        'resolvedInputs',
      );
    });

    it('refuses a request without an account record', async () => {
      await expectMalformed(
        custodyPayload(creation(), { accountRecord: undefined }),
        'accountRecord',
      );
    });

    it.each([
      ['not an array', requestedScopeOf(agentGrant)],
      ['an entry in another shape', [{ slot: '0' }]],
      ['an entry as JSON text', [JSON.stringify(requestedScopeOf(agentGrant))]],
      [
        'one grant ID twice',
        [requestedScopeOf(agentGrant), requestedScopeOf(agentGrant)],
      ],
      [
        'more grants than a transaction issues',
        Array.from({ length: CUSTODY_MAX_GRANT_BATCH + 1 }, (_, slot) =>
          requestedScopeOf({ ...agentGrant, slot: BigInt(slot) }),
        ),
      ],
    ])('refuses requested scopes that are %s', async (_, requestedScopes) => {
      await expectMalformed(
        custodyPayload(issueGrant(), { requestedScopes }),
        'requestedScopes',
      );
    });

    it.each([
      ['not an array', grantUtxo(agentGrant)],
      ['an entry that is not hex', ['zz']],
      ['an entry that is not an unspent output', ['8200']],
      [
        'an entry with bytes after the unspent output',
        [`${serializeResolvedInput(grantUtxo(agentGrant))}00`],
      ],
      [
        'more grant UTxOs than an account holds',
        Array.from({ length: CUSTODY_MAX_GRANTS + 1 }, (_, slot) =>
          serializeResolvedInput(
            grantUtxo({ ...agentGrant, slot: BigInt(slot) }),
          ),
        ),
      ],
    ])('refuses grant UTxOs that are %s', async (_, grantUtxos) => {
      await expectMalformed(
        custodyPayload(revokeGrant(), { grantUtxos }),
        'grantUtxos',
      );
    });

    it.each([
      ['device', undefined],
      ['device', TESTNET_CUSTODY_XPUB],
      ['device.extendedAccountPublicKey', { index: 0 }],
      [
        'device.extendedAccountPublicKey',
        { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB.slice(2), index: 0 },
      ],
      [
        'device.index',
        { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: -1 },
      ],
      [
        'device.index',
        { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 1.5 },
      ],
      [
        'device.index',
        { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 2 ** 31 },
      ],
    ])('refuses the device field %s: %o', async (field, device) => {
      await expectMalformed(custodyPayload(creation(), { device }), field);
    });
  });

  describe('network', () => {
    it('refuses a body that states another network', async () => {
      await expectRefused(
        custodyPayload({
          ...creation(),
          body: { networkId: Cardano.NetworkId.Mainnet },
        }),
        'network-mismatch',
        'body-network',
      );
    });

    it('refuses a body that pays a Mainnet address on a testnet', async () => {
      const mainnetStranger = Cardano.EnterpriseAddress.fromCredentials(
        Cardano.NetworkId.Mainnet,
        {
          type: Cardano.CredentialType.KeyHash,
          hash: Cardano.Address.fromBech32(STRANGER_ADDRESS)
            .asEnterprise()!
            .getPaymentCredential().hash,
        },
      )
        .toAddress()
        .toBech32() as Cardano.PaymentAddress;
      const shape = issueGrant();
      await expectRefused(
        custodyPayload({
          ...shape,
          outputs: [...shape.outputs, payout(1_000_000n, mainnetStranger)],
        }),
        'network-mismatch',
        'body-network',
      );
    });

    describe('reads every element that names a network', () => {
      // Each case puts a Mainnet value in one element of an otherwise valid
      // Preprod request, so a walk that stops reading that element fails
      // here. The outputs and the body network id are covered above.
      const mainnetAddress = Cardano.EnterpriseAddress.fromCredentials(
        Cardano.NetworkId.Mainnet,
        { type: Cardano.CredentialType.KeyHash, hash: STRANGER_KEY_HASH },
      )
        .toAddress()
        .toBech32() as Cardano.PaymentAddress;
      const mainnetRewardAccount = Cardano.RewardAccount.fromCredential(
        { type: Cardano.CredentialType.KeyHash, hash: STRANGER_KEY_HASH },
        Cardano.NetworkId.Mainnet,
      );
      const testnetRewardAccount = Cardano.RewardAccount.fromCredential(
        { type: Cardano.CredentialType.KeyHash, hash: STRANGER_KEY_HASH },
        Cardano.NetworkId.Testnet,
      );
      const anchor = {
        url: 'https://example.com/a',
        dataHash: Hash32ByteBase16('00'.repeat(32)),
      };

      it.each<[string, () => CustodyTransactionShape]>([
        [
          'the collateral return',
          () => ({
            ...issueGrant(),
            collateralReturn: payout(4_625_000n, mainnetAddress),
          }),
        ],
        [
          'a withdrawal',
          () => ({
            ...issueGrant(),
            withdrawals: [{ stakeAddress: mainnetRewardAccount, quantity: 0n }],
          }),
        ],
        [
          'a direct deposit',
          () => ({
            ...issueGrant(),
            body: {
              directDeposits: [
                { stakeAddress: mainnetRewardAccount, quantity: 1n },
              ],
            },
          }),
        ],
        [
          'a proposal deposit return',
          () => ({
            ...issueGrant(),
            body: {
              proposalProcedures: [
                {
                  deposit: 1n,
                  rewardAccount: mainnetRewardAccount,
                  anchor,
                  governanceAction: {
                    __typename: Cardano.GovernanceActionType.info_action,
                  },
                },
              ],
            },
          }),
        ],
        [
          'a treasury withdrawal a proposal pays',
          () => ({
            ...issueGrant(),
            body: {
              proposalProcedures: [
                {
                  deposit: 1n,
                  rewardAccount: testnetRewardAccount,
                  anchor,
                  governanceAction: {
                    __typename:
                      Cardano.GovernanceActionType.treasury_withdrawals_action,
                    withdrawals: new Set([
                      { rewardAccount: mainnetRewardAccount, coin: 1n },
                    ]),
                    policyHash: null,
                  },
                },
              ],
            },
          }),
        ],
        [
          'a pool registration reward account',
          () => ({
            ...issueGrant(),
            certificates: [
              {
                __typename: Cardano.CertificateType.PoolRegistration,
                poolParameters: {
                  id: Cardano.PoolId.fromKeyHash(
                    Ed25519KeyHashHex('dd'.repeat(28)),
                  ),
                  rewardAccount: mainnetRewardAccount,
                  pledge: 0n,
                  cost: 0n,
                  margin: { numerator: 0, denominator: 1 },
                  relays: [],
                  owners: [],
                  vrf: Cardano.VrfVkHex('00'.repeat(32)),
                },
              },
            ],
          }),
        ],
        [
          'a sub-transaction output',
          () => ({
            ...issueGrant(),
            body: {
              subTransactions: [
                {
                  body: {
                    inputs: [],
                    outputs: [payout(1_000_000n, mainnetAddress)],
                  },
                  witness: { signatures: new Map() },
                },
              ],
            },
          }),
        ],
      ])('refuses a Mainnet value in %s', async (_, shape) => {
        await expectRefused(
          custodyPayload(shape()),
          'network-mismatch',
          'body-network',
        );
      });
    });

    it('refuses an output address the transaction decoder cannot read', async () => {
      const shape = issueGrant();
      const serializedTx = serializeCustodyTransaction(shape);
      // The control output's account address is a 57-byte base address
      // (header 0x30: script payment and script stake parts, testnet);
      // declaring it one byte longer leaves CBOR that still parses but an
      // address of no valid length.
      const accountAddressBytes = Cardano.Address.fromBech32(
        identity.address,
      ).toBytes();
      const encoded = `5839${accountAddressBytes}`;
      expect(serializedTx).toContain(encoded);
      await expectMalformed(
        custodyPayload(shape, {
          serializedTx: serializedTx.replace(
            encoded,
            `583a${accountAddressBytes}00`,
          ),
        }),
        'serializedTx',
      );
    });

    it('refuses a body that names no network at all', async () => {
      await expectRefused(
        custodyPayload({
          ...creation(),
          outputs: [],
          collateralReturn: undefined,
          withdrawals: undefined,
        }),
        'network-mismatch',
        'no-network-evidence',
      );
    });

    it('refuses a request for Mainnet whose body is on a testnet', async () => {
      await expectRefused(
        custodyPayload(creation(), { chainId: Cardano.ChainIds.Mainnet }),
        'network-mismatch',
        'body-network',
      );
    });
  });

  describe('account record', () => {
    it('refuses a record of an unknown contract version', async () => {
      await expectRefused(
        custodyPayload(creation(), {
          accountRecord: { ...record, accountValidatorHash: 'ab'.repeat(28) },
        }),
        'custody-unsupported-version',
        'unsupported-contract-version',
      );
    });

    it('refuses a record whose creator does not derive its stake script', async () => {
      await expectRefused(
        custodyPayload(creation(), {
          accountRecord: { ...record, creatorKeyHash: DEVICE_1 },
        }),
        'custody-context-mismatch',
        'invalid-record',
      );
    });

    it('refuses a record of another network', async () => {
      await expectRefused(
        custodyPayload(creation(), {
          accountRecord: {
            ...record,
            networkMagic: Cardano.NetworkMagics.Preview,
          },
        }),
        'custody-context-mismatch',
        'invalid-record',
      );
    });
  });

  describe('inspection', () => {
    it('refuses a device the previous state does not list', async () => {
      await expectRefused(
        custodyPayload(issueGrant(), {
          device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 1 },
        }),
        'custody-device-not-listed',
        'not-listed',
      );
    });

    it('refuses a creation the device does not create', async () => {
      await expectRefused(
        custodyPayload(creation(), {
          device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 1 },
        }),
        'custody-device-not-listed',
        'not-creator',
      );
    });

    it('refuses a grant spend: the passkey is never a grantee', async () => {
      const spentGrant = grantUtxo(agentGrant);
      const leaving = 2_250_000n;
      const spend: CustodyTransactionShape = {
        inputs: [spentGrant, fundUtxo],
        referenceInputs: [
          utxo(0x10, controlOutput(grantedState)),
          ...PARKED_SCRIPTS,
        ],
        spendRedeemers: [
          { spent: spentGrant, redeemer: { kind: 'spendWithGrant' } },
          { spent: fundUtxo, redeemer: { kind: 'fund' } },
        ],
        outputs: [
          grantOutput({
            ...agentGrant,
            scope: { ...agentGrant.scope, cap: agentGrant.scope.cap - leaving },
          }),
          payout(2_000_000n, STRANGER_ADDRESS),
          payout(10_000_000n - leaving, identity.address),
        ],
        withdrawals: [logicRun()],
        requiredSigners: [AGENT_KEY],
      };
      const error = await refusalOf(custodyPayload(spend));
      expect(error).toMatchObject({
        code: 'custody-unsupported-operation',
        reason: 'grant-spend',
        detail: { input: { txId: spentGrant[0].txId, index: 0 } },
      });
    });

    it('refuses a resolution the body does not name', async () => {
      const payload = custodyPayload(creation());
      await expectRefused(
        {
          ...payload,
          resolvedInputs: [
            ...payload.resolvedInputs,
            serializeResolvedInput(control),
          ],
        },
        'custody-context-mismatch',
        'resolution-not-in-body',
      );
    });
  });

  describe('logic', () => {
    const UNKNOWN_LOGIC = HexBlob(
      '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d',
    );
    const unknownLogicRun = {
      ...logicRun(),
      stakeAddress: Cardano.RewardAccount.fromCredential(
        {
          type: Cardano.CredentialType.ScriptHash,
          hash: Hash28ByteBase16(UNKNOWN_LOGIC),
        },
        Cardano.NetworkId.Testnet,
      ),
    };

    it('reads an owner operation that runs the logic and references the parked scripts', async () => {
      const checked = await check(custodyPayload(revokeGrant()));

      expect(checked.account.operations).toEqual([
        { kind: 'revoke-grant', slot: 0n },
      ]);
      expect(checked.account).not.toHaveProperty('logicDraw');
    });

    it('reads a logic run that draws lovelace and keeps it at the account', async () => {
      const shape = revokeGrant();
      const drawn = 3_000_000n;

      const checked = await check(
        custodyPayload({
          ...shape,
          withdrawals: [logicRun(drawn)],
          outputs: [
            shape.outputs[0],
            payout(9_750_000n + drawn, identity.address),
          ],
        }),
      );

      expect(checked.account.operations).toContainEqual({
        kind: 'revoke-grant',
        slot: 0n,
      });
      expect(checked.account.logicDraw).toBe(drawn);
    });

    it.each<[string, () => CustodyTransactionShape, string]>([
      [
        'an owner operation that does not run the logic',
        () => ({ ...revokeGrant(), withdrawals: undefined }),
        'custody-unsupported-operation/logic-withdrawal-missing',
      ],
      [
        'a control output under a logic outside the catalogue',
        () => deviceRewrite({ ...initialState, logic: UNKNOWN_LOGIC }),
        'custody-unsupported-version/unknown-logic',
      ],
      [
        'an operation on a control state under a logic outside the catalogue',
        () => {
          const state = { ...initialState, logic: UNKNOWN_LOGIC };
          return {
            ...deviceRewrite(state, { before: state }),
            withdrawals: [unknownLogicRun],
          };
        },
        'custody-unsupported-version/unknown-logic',
      ],
      [
        'a logic run that draws lovelace out of the account',
        () => {
          const shape = revokeGrant();
          return {
            ...shape,
            withdrawals: [logicRun(3_000_000n)],
            outputs: [...shape.outputs, payout(3_000_000n, STRANGER_ADDRESS)],
          };
        },
        'custody-unsupported-operation/logic-draw-leaves-account',
      ],
      [
        'a reference input that carries a script other than a parked contract script',
        () => {
          const shape = revokeGrant();
          return {
            ...shape,
            referenceInputs: [
              ...PARKED_SCRIPTS,
              utxo(0x50, {
                ...payout(2_000_000n, STRANGER_ADDRESS),
                scriptReference: identity.stakeScript,
              }),
            ],
          };
        },
        'custody-unsupported-operation/foreign-reference-script',
      ],
      [
        'a parked script outref resolved to another script',
        () => {
          const shape = revokeGrant();
          const [proxy, logic] = PARKED_SCRIPTS;
          return {
            ...shape,
            referenceInputs: [
              [
                proxy[0],
                { ...proxy[1], scriptReference: identity.stakeScript },
              ],
              logic,
            ],
          };
        },
        'custody-context-mismatch/reference-script-mismatch',
      ],
      [
        'a reference input without a script that parks no contract script',
        () => ({
          ...revokeGrant(),
          referenceInputs: [
            ...PARKED_SCRIPTS,
            utxo(0x50, payout(2_000_000n, STRANGER_ADDRESS)),
          ],
        }),
        'custody-unsupported-operation/foreign-reference-input',
      ],
    ])('refuses %s before consent', async (_, shape, refusal) => {
      const [code, reason] = refusal.split('/');
      await expectRefused(custodyPayload(shape()), code, reason);
    });
  });

  describe('grant operations', () => {
    it('reads a revoke', async () => {
      const checked = await check(custodyPayload(revokeGrant()));

      expect(checked.account.operations).toEqual([
        { kind: 'revoke-grant', slot: 0n },
      ]);
      expect(checked.account.stateChange?.revokedAdded).toEqual([0n]);
      expect(checked.account.issuedGrants).toEqual([]);
    });

    it('reads a replacement as a revoke and an issue, declaring the new grant', async () => {
      const checked = await check(
        custodyPayload(replaceGrant(), {
          requestedScopes: [requestedScopeOf(successorGrant)],
        }),
      );

      expect(checked.account.operations).toEqual([
        { kind: 'replace-grant', slot: 0n, issuedSlot: 1n },
      ]);
      expect(checked.account.issuedGrants.map(({ grant }) => grant)).toEqual([
        successorGrant,
      ]);
    });

    it('reads a sweep of a revoked grant from its resolution and its burned token', async () => {
      const checked = await check(custodyPayload(sweepGrants()));

      expect(checked.account.operations).toEqual([
        { kind: 'sweep-grants', slots: [0n] },
      ]);
      expect(checked.account.sweptGrants).toMatchObject([
        {
          assetId: custodyGrantAssetId(record, 0n),
          grant: agentGrant,
          death: 'revoked',
        },
      ]);
      expect(checked.account.stateChange?.revokedRemoved).toEqual([0n]);
      expect(checked.account.controlOutput?.lovelace).toBe(
        2_000_000n + GRANT_LOVELACE,
      );
    });

    // Each shape is one Lace never builds; the signer refuses it with the
    // inspection's first refusal, before consent and so before the words.
    it.each<[string, () => CustodyTransactionShape, string]>([
      [
        'a control UTxO referenced by an owner operation',
        () => ({
          ...revokeGrant(),
          referenceInputs: [
            ...PARKED_SCRIPTS,
            utxo(0x15, controlOutput(grantedState)),
          ],
        }),
        'custody-unsupported-operation/reference-control',
      ],
      [
        'an issue and a sweep in one rewrite',
        () => {
          const sweep = sweepGrants();
          return {
            ...sweep,
            outputs: [
              sweep.outputs[0],
              grantOutput(successorGrant),
              ...sweep.outputs.slice(1),
            ],
            mint: new Map([
              ...sweep.mint!,
              [custodyGrantAssetId(record, successorGrant.slot), 1n],
            ]),
          };
        },
        'custody-unsupported-operation/issue-sweep-mixed',
      ],
      [
        'a grant issued under another generation than the control output',
        () => issueGrant({ grant: { ...agentGrant, generation: 1n } }),
        'custody-malformed-datum/grant-output-invalid',
      ],
      [
        'a grant issued in a slot other than the next one',
        () => issueGrant({ grant: successorGrant }),
        'custody-malformed-datum/grant-output-invalid',
      ],
      [
        'the sweep of a live grant',
        () =>
          sweepGrants({
            before: grantedState,
            after: { ...grantedState, outstanding: 0n },
          }),
        'custody-unsupported-operation/sweep-not-dead',
      ],
      [
        'a revoked slot taken off the list without its token burned',
        () => deviceRewrite(grantedState, { before: revokedState }),
        'custody-unsupported-operation/revoked-slot-restored',
      ],
      [
        'a creation whose state has issued a grant',
        () => {
          const shape = creation();
          return {
            ...shape,
            outputs: [
              controlOutput(grantedState, 1_500_000n),
              ...shape.outputs.slice(1),
            ],
          };
        },
        'custody-context-mismatch/initial-state',
      ],
    ])('refuses %s', async (_, shape, refusal) => {
      const [code, reason] = refusal.split('/');
      await expectRefused(custodyPayload(shape()), code, reason);
    });
  });

  describe('reported grant UTxOs', () => {
    const grantUtxosPayload = (
      grantUtxos: readonly Cardano.Utxo[],
      shape = revokeGrant(),
    ) =>
      custodyPayload(shape, {
        grantUtxos: grantUtxos.map(serializeResolvedInput),
      });

    const grantUtxoWith = (txOut: Partial<Cardano.TxOut>) =>
      utxo(0x30, { ...grantOutput(agentGrant), ...txOut });

    it('reads the grant each carries, in slot order', async () => {
      const twoGrants = { ...initialState, nextSlot: 2n, outstanding: 2n };
      const checked = await check(
        grantUtxosPayload(
          [grantUtxo(successorGrant), grantUtxo(agentGrant)],
          deviceRewrite({ ...twoGrants, revoked: [0n] }, { before: twoGrants }),
        ),
      );

      expect(
        checked.grantUtxos?.map(({ utxo: [input], grant, token }) => ({
          input,
          grant,
          token,
        })),
      ).toEqual([
        {
          input: grantUtxo(agentGrant)[0],
          grant: agentGrant,
          token: custodyGrantAssetId(record, 0n),
        },
        {
          input: grantUtxo(successorGrant)[0],
          grant: successorGrant,
          token: custodyGrantAssetId(record, 1n),
        },
      ]);
    });

    it('reads as many grant UTxOs as an account holds', async () => {
      const grants = Array.from({ length: CUSTODY_MAX_GRANTS }, (_, slot) =>
        grantUtxo({ ...agentGrant, slot: BigInt(slot) }),
      );
      await expect(check(grantUtxosPayload(grants))).resolves.toMatchObject({
        grantUtxos: { length: CUSTODY_MAX_GRANTS },
      });
    });

    it('reads none when the app reports none, and an empty list when it reports an empty one', async () => {
      await expect(
        check(custodyPayload(revokeGrant())),
      ).resolves.not.toHaveProperty('grantUtxos');
      await expect(check(grantUtxosPayload([]))).resolves.toMatchObject({
        grantUtxos: [],
      });
    });

    it('reads a grant UTxO the transaction also spends, reported as resolved', async () => {
      const checked = await check(
        grantUtxosPayload([grantUtxo(agentGrant)], sweepGrants()),
      );

      expect(checked.grantUtxos?.map(({ grant }) => grant)).toEqual([
        agentGrant,
      ]);
    });

    it('refuses a grant UTxO at another address', async () => {
      const error = await refusalOf(
        grantUtxosPayload([grantUtxoWith({ address: STRANGER_ADDRESS })]),
      );
      expect(error).toMatchObject({
        code: 'custody-context-mismatch',
        reason: 'grant-utxo-address',
        detail: { address: STRANGER_ADDRESS },
      });
    });

    const otherAccountGrantToken = custodyGrantAssetId(
      { ...record, stakeScriptHash: Hash28ByteBase16('dd'.repeat(28)) },
      0n,
    );

    it.each<[string, Cardano.Utxo]>([
      ['a fund UTxO', fundUtxo],
      ['the control UTxO', control],
      [
        "another account's grant token",
        grantUtxoWith({
          value: {
            coins: GRANT_LOVELACE,
            assets: new Map([[otherAccountGrantToken, 1n]]),
          },
        }),
      ],
      [
        'two of its grant token',
        grantUtxoWith({
          value: {
            coins: GRANT_LOVELACE,
            assets: new Map([[custodyGrantAssetId(record, 0n), 2n]]),
          },
        }),
      ],
    ])('refuses %s reported as a grant UTxO', async (_, reported) => {
      await expectRefused(
        grantUtxosPayload([reported]),
        'custody-context-mismatch',
        'grant-utxo-not-grant',
      );
    });

    it.each<[string, Cardano.Utxo, string]>([
      [
        'a grant token beside another asset',
        grantUtxoWith({
          value: {
            coins: GRANT_LOVELACE,
            assets: new Map([
              [custodyGrantAssetId(record, 0n), 1n],
              [Cardano.AssetId(`${'99'.repeat(28)}`), 1n],
            ]),
          },
        }),
        'grant-value-not-strict',
      ],
      [
        'a grant token without an inline datum',
        grantUtxoWith({ datum: undefined }),
        'grant-datum-not-inline',
      ],
      [
        'a datum that is not a grant',
        grantUtxoWith({ datum: 42n }),
        'grant-datum-malformed',
      ],
      [
        "a grant whose slot is not its token's",
        grantUtxoWith({ datum: grantOutput(successorGrant).datum }),
        'grant-slot-mismatch',
      ],
    ])('refuses %s', async (_, reported, anomaly) => {
      const error = await refusalOf(grantUtxosPayload([reported]));
      expect(error).toMatchObject({
        code: 'custody-malformed-datum',
        reason: 'grant-utxo-malformed',
        detail: { anomaly: { code: anomaly } },
      });
    });

    it('refuses an outpoint reported twice, even with two grants', async () => {
      await expectRefused(
        grantUtxosPayload([
          utxo(0x30, grantOutput(agentGrant)),
          utxo(0x30, grantOutput(successorGrant)),
        ]),
        'custody-context-mismatch',
        'duplicate-grant-utxo',
      );
    });

    it('refuses a slot reported at two outpoints', async () => {
      const error = await refusalOf(
        grantUtxosPayload([
          grantUtxo(agentGrant),
          utxo(0x40, grantOutput(agentGrant)),
        ]),
      );
      expect(error).toMatchObject({
        code: 'custody-context-mismatch',
        reason: 'duplicate-grant-utxo',
        detail: {
          input: { txId: utxo(0x40, grantOutput(agentGrant))[0].txId },
          slot: 0n,
        },
      });
    });

    it('refuses a grant UTxO reported otherwise than the transaction resolves it', async () => {
      const raised: CustodyGrant = {
        ...agentGrant,
        scope: { ...agentGrant.scope, cap: agentGrant.scope.cap + 1n },
      };
      await expectRefused(
        grantUtxosPayload([utxo(0x30, grantOutput(raised))], sweepGrants()),
        'custody-context-mismatch',
        'grant-utxo-resolution',
      );
    });

    it('checks them after the account record', async () => {
      await expectRefused(
        custodyPayload(revokeGrant(), {
          accountRecord: { ...record, creatorKeyHash: DEVICE_1 },
          grantUtxos: [serializeResolvedInput(fundUtxo)],
        }),
        'custody-context-mismatch',
        'invalid-record',
      );
    });

    it('checks them before the transaction', async () => {
      await expectRefused(
        custodyPayload(revokeGrant(), {
          device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 1 },
          grantUtxos: [serializeResolvedInput(fundUtxo)],
        }),
        'custody-context-mismatch',
        'grant-utxo-not-grant',
      );
    });
  });

  describe('requested scopes', () => {
    const grantPayload = (scope: Record<string, unknown>) =>
      custodyPayload(issueGrant(), { requestedScopes: [scope] });

    it.each([
      ['grantee', { grantee: 'dd'.repeat(28) }],
      ['asset', { asset: { policyId: '99'.repeat(28), assetName: '' } }],
      ['perCallCap', { perCallCap: '10000001' }],
      ['cap', { cap: '15000001' }],
      ['lovelacePerCallCap', { lovelacePerCallCap: '1' }],
      ['lovelaceCap', { lovelaceCap: '1' }],
      ['expiresAt', { expiresAt: '1893456000001' }],
      ['recipients', { recipients: [STRANGER_ADDRESS] }],
    ])(
      'refuses a declared %s the grant does not carry',
      async (field, change) => {
        const error = await refusalOf(
          grantPayload({ ...requestedScopeOf(agentGrant), ...change }),
        );
        expect(error).toMatchObject({
          code: 'custody-scope-mismatch',
          reason: 'field-mismatch',
          detail: { slot: 0n, fields: [field] },
        });
      },
    );

    it('refuses a declared grant the transaction does not write', async () => {
      await expectRefused(
        grantPayload({ ...requestedScopeOf(agentGrant), slot: '1' }),
        'custody-scope-mismatch',
        'grant-not-written',
      );
    });

    it('refuses a written grant the app did not declare', async () => {
      await expectRefused(
        custodyPayload(issueGrant(), { requestedScopes: [] }),
        'custody-scope-mismatch',
        'undeclared-grant',
      );
    });

    it('refuses the grant a replacement revokes, declared as written', async () => {
      await expectRefused(
        custodyPayload(replaceGrant(), {
          requestedScopes: [requestedScopeOf(agentGrant)],
        }),
        'custody-scope-mismatch',
        'grant-not-written',
      );
    });

    it('refuses a replacement that declares nothing', async () => {
      const error = await refusalOf(
        custodyPayload(replaceGrant(), { requestedScopes: [] }),
      );
      expect(error).toMatchObject({
        code: 'custody-scope-mismatch',
        reason: 'undeclared-grant',
        detail: { slot: successorGrant.slot },
      });
    });

    it.each<[string, () => CustodyTransactionShape]>([
      ['creation', creation],
      ['a revoke', revokeGrant],
      ['a sweep', () => sweepGrants()],
    ])('declares nothing at %s, which issues no grant', async (_, shape) => {
      await expect(
        check(custodyPayload(shape(), { requestedScopes: [] })),
      ).resolves.toMatchObject({ requestedScopes: [] });
    });
  });

  describe('metadata meanings', () => {
    /** An owner spend carrying a payment intent id under label 1971, as Midnight City reads it. */
    const paymentReference: Cardano.TxMetadata = new Map([
      [
        1971n,
        new Map<Cardano.Metadatum, Cardano.Metadatum>([['intentId', 'pi_42']]),
      ],
    ]);
    const spendWithReference = (): CustodyTransactionShape => ({
      ...deviceRewrite(initialState),
      auxiliaryData: { blob: paymentReference },
    });

    it('reads the metadata the transaction carries', async () => {
      const checked = await check(custodyPayload(spendWithReference()));

      expect(checked.inspection.metadata).toEqual(paymentReference);
      expect(checked.metadataMeanings).toBeUndefined();
    });

    it('reads the meaning the app gives each label it carries', async () => {
      const checked = await check(
        custodyPayload(spendWithReference(), {
          metadataMeanings: { 1971: 'Midnight City subscription payment' },
        }),
      );

      expect(checked.metadataMeanings).toEqual(
        new Map([[1971n, 'Midnight City subscription payment']]),
      );
    });

    it('reads no meanings from an empty object', async () => {
      const checked = await check(
        custodyPayload(spendWithReference(), { metadataMeanings: {} }),
      );

      expect(checked.metadataMeanings).toBeUndefined();
    });

    it('refuses a meaning for a label the transaction does not carry', async () => {
      const error = await refusalOf(
        custodyPayload(spendWithReference(), {
          metadataMeanings: { 674: 'A message' },
        }),
      );
      expect(error).toMatchObject({
        code: 'custody-context-mismatch',
        reason: 'metadata-label-not-carried',
        detail: { label: 674n },
      });
    });

    it('refuses a meaning when the transaction carries no metadata', async () => {
      await expectRefused(
        custodyPayload(deviceRewrite(initialState), {
          metadataMeanings: { 1971: 'Midnight City subscription payment' },
        }),
        'custody-context-mismatch',
        'metadata-label-not-carried',
      );
    });

    it.each<[string, unknown]>([
      ['not an object', 'Midnight City'],
      ['a list', ['Midnight City']],
      ['keyed by text that is not a label', { intentId: 'Midnight City' }],
      ['keyed by a negative label', { '-1': 'Midnight City' }],
      ['keyed by a label with a leading zero', { '01971': 'Midnight City' }],
      ['keyed by a label beyond 64 bits', { [(2n ** 64n).toString()]: 'x' }],
      ['a meaning that is not text', { 1971: 42 }],
      ['an empty meaning', { 1971: '' }],
      ['a meaning over 200 characters', { 1971: 'x'.repeat(201) }],
    ])('refuses metadata meanings that are %s', async (_, metadataMeanings) => {
      await expect(
        check(custodyPayload(spendWithReference(), { metadataMeanings })),
      ).rejects.toEqual(new MalformedRequestError('metadataMeanings'));
    });
  });
});

describe('checkOrdinaryCardanoTransaction', () => {
  it('passes a transaction that touches no custody account', () => {
    expect(
      checkOrdinaryCardanoTransaction(
        serializeCustodyTransaction({
          inputs: [control],
          outputs: [payout(1_000_000n, STRANGER_ADDRESS)],
        }),
      ),
    ).toEqual({ custodyTouching: false, depositOnly: false, reasons: [] });
  });

  it('passes a deposit and reports it', () => {
    expect(
      checkOrdinaryCardanoTransaction(
        serializeCustodyTransaction({
          inputs: [control],
          outputs: [payout(1_000_000n, identity.address)],
        }),
      ),
    ).toMatchObject({ custodyTouching: false, depositOnly: true });
  });

  it.each([
    ['a custody creation', creation(), 'account-token'],
    ['an owner operation', issueGrant(), 'account-token'],
    [
      'a grant token paid to a custody address',
      { inputs: [control], outputs: [grantOutput(agentGrant)] },
      'account-token',
    ],
    [
      'an inline datum paid to a custody address',
      {
        inputs: [control],
        outputs: [
          {
            ...payout(1_000_000n, identity.address),
            datum: encodeCustodyAccountState(initialState),
          },
        ],
      },
      'output-datum',
    ],
    [
      'a reserve paid to a custody address',
      {
        inputs: [control],
        outputs: [
          {
            ...payout(1_000_000n, identity.address),
            datum: { constructor: 0n, fields: { items: [] } },
          },
        ],
      },
      'output-datum',
    ],
  ])('refuses %s as needing the custody kind', (_, shape, reason) => {
    expect(
      thrownBy(() =>
        checkOrdinaryCardanoTransaction(serializeCustodyTransaction(shape)),
      ),
    ).toMatchObject({ code: 'custody-request-required', reason });
  });

  it('refuses a transaction it cannot decode as malformed', () => {
    expect(() => checkOrdinaryCardanoTransaction('not-cbor')).toThrow(
      MalformedRequestError,
    );
  });

  describe('a payment to the account validator that nothing can spend', () => {
    // The account validator with a key stake part is no custody account: no
    // redeemer can spend what it holds, so no signing kind accepts it.
    const lockedAddress = Cardano.BaseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      {
        type: Cardano.CredentialType.ScriptHash,
        hash: CURRENT_CUSTODY_CONTRACT_VERSION.accountValidatorHash,
      },
      { type: Cardano.CredentialType.KeyHash, hash: STRANGER_KEY_HASH },
    )
      .toAddress()
      .toBech32() as Cardano.PaymentAddress;

    it('is refused as a locked output, the code the custody kind gives it', () => {
      expect(
        thrownBy(() =>
          checkOrdinaryCardanoTransaction(
            serializeCustodyTransaction({
              inputs: [control],
              outputs: [payout(1_000_000n, lockedAddress)],
            }),
          ),
        ),
      ).toMatchObject({
        code: 'custody-locked-output',
        reason: 'unspendable-output',
      });
    });

    it('is reported after a custody operation, which needs the custody kind first', () => {
      const shape = issueGrant();
      expect(
        thrownBy(() =>
          checkOrdinaryCardanoTransaction(
            serializeCustodyTransaction({
              ...shape,
              outputs: [payout(1_000_000n, lockedAddress), ...shape.outputs],
            }),
          ),
        ),
      ).toMatchObject({
        code: 'custody-request-required',
        reason: 'account-token',
      });
    });
  });

  it('refuses an account validator witness alone', () => {
    expect(
      thrownBy(() =>
        checkOrdinaryCardanoTransaction(
          serializeCustodyTransaction({
            inputs: [control],
            outputs: [payout(1_000_000n, STRANGER_ADDRESS)],
            scripts: [CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator],
          }),
        ),
      ),
    ).toMatchObject({
      code: 'custody-request-required',
      reason: 'account-validator-witness',
    });
  });

  // The logic run is the one body element every account operation carries,
  // whether its scripts are attached or referenced.
  it('refuses a run of a known logic alone', () => {
    expect(
      thrownBy(() =>
        checkOrdinaryCardanoTransaction(
          serializeCustodyTransaction({
            inputs: [utxo(0x60, payout(5_000_000n, STRANGER_ADDRESS))],
            referenceInputs: PARKED_SCRIPTS,
            outputs: [payout(4_750_000n, STRANGER_ADDRESS)],
            withdrawals: [logicRun()],
          }),
        ),
      ),
    ).toMatchObject({
      code: 'custody-request-required',
      reason: 'logic-withdrawal',
    });
  });
});
