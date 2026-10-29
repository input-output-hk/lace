import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash32ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { ACCOUNT_VALIDATOR_HASH } from '@lace-lib/cardano-custody';
import { describe, expect, it } from 'vitest';

import { classifyCardanoCustodyAccount } from '../../src/custody/account-state';
import {
  cardanoCustodyAccount,
  controlUtxo,
  custodyDeviceKeyHash,
  custodyGrant,
  custodyLovelaceScope,
  custodyProtocolParameters,
  custodyState,
  custodyStateNftId,
  custodyUtxo,
  foreignPaymentAddress,
  grantUtxo,
  observerCustodyAccount,
  otherDeviceKeyHash,
} from '../custody-mocks';

const account = cardanoCustodyAccount.blockchainSpecific;
const DATUM_HASH = Hash32ByteBase16('dd'.repeat(32));
const TOKEN_ID = Cardano.AssetId(`${'99'.repeat(28)}746f6b656e`);
/** The ledger minimum of a control output holding a fresh state on Preprod. */
const FRESH_CONTROL_MINIMUM = 1_586_080n;

const fund = custodyUtxo(10, { coins: 5_000_000n });
const tokenFund = custodyUtxo(11, {
  value: { coins: 1_200_000n, assets: new Map([[TOKEN_ID, 7n]]) },
});
const ownReserve = custodyUtxo(12, {
  coins: 3_000_000n,
  datum: Serialization.PlutusData.fromCbor(HexBlob('d87980')).toCore(),
});
const foreignReserve = custodyUtxo(13, { coins: 2_500_000n, datum: 42n });
const stranded = custodyUtxo(14, { coins: 4_000_000n, datumHash: DATUM_HASH });
const agentGrant = grantUtxo(
  15,
  custodyGrant(0n, 'a1', custodyLovelaceScope(1_800_000_000_000n)),
  1_700_000n,
);

type AccountStateInput = Parameters<typeof classifyCardanoCustodyAccount>[0];

const classify = (
  input: Partial<AccountStateInput> & Pick<AccountStateInput, 'utxos'>,
) =>
  classifyCardanoCustodyAccount({
    account,
    withdrawableRewards: 0n,
    protocolParameters: custodyProtocolParameters,
    ...input,
  });

describe('classifyCardanoCustodyAccount', () => {
  it('reports a live account with its control state, control lovelace split and every UTxO kind', () => {
    const control = controlUtxo(1);

    expect(
      classify({
        utxos: [
          fund,
          control,
          tokenFund,
          ownReserve,
          foreignReserve,
          stranded,
          agentGrant,
        ],
        withdrawableRewards: 9n,
      }),
    ).toEqual({
      status: 'live',
      controlUtxo: control,
      state: custodyState,
      controlMinimumLovelace: FRESH_CONTROL_MINIMUM,
      controlHeadroomLovelace: 3_000_000n - FRESH_CONTROL_MINIMUM,
      currentDeviceListed: true,
      funds: [fund, tokenFund],
      reserves: { own: [ownReserve], foreign: [foreignReserve] },
      grants: [
        {
          utxo: agentGrant,
          grant: custodyGrant(
            0n,
            'a1',
            custodyLovelaceScope(1_800_000_000_000n),
          ),
          token: [...agentGrant[1].value.assets!.keys()][0],
        },
      ],
      grantLockedLovelace: 1_700_000n,
      stranded: [stranded],
      anomalies: [],
      withdrawableRewards: 9n,
    });
  });

  it('grows the control minimum with the state', () => {
    const grown = {
      ...custodyState,
      devices: [...custodyState.devices, HexBlob(otherDeviceKeyHash)],
    };

    const result = classify({ utxos: [controlUtxo(1, grown)] });

    // One more 28-byte device costs its 30 encoded bytes.
    expect(result).toMatchObject({
      controlMinimumLovelace: FRESH_CONTROL_MINIMUM + 30n * 4310n,
    });
  });

  it('reports no headroom when the control output holds less than its minimum', () => {
    expect(
      classify({ utxos: [controlUtxo(1, custodyState, 1_000_000n)] }),
    ).toMatchObject({
      controlMinimumLovelace: FRESH_CONTROL_MINIMUM,
      controlHeadroomLovelace: 0n,
    });
  });

  it('sums the lovelace every grant UTxO locks', () => {
    const second = grantUtxo(
      16,
      custodyGrant(1n, 'a2', custodyLovelaceScope(1_800_000_000_000n)),
      2_300_000n,
    );

    expect(
      classify({ utxos: [controlUtxo(1), second, agentGrant] })
        .grantLockedLovelace,
    ).toBe(4_000_000n);
  });

  it('reports a deposit under a datum hash as stranded, never as a fund', () => {
    const result = classify({ utxos: [controlUtxo(1), stranded] });

    expect(result.funds).toEqual([]);
    expect(result.stranded).toEqual([stranded]);
  });

  // Blockfrost reports an inline datum's hash as well, and a UTxO stored from
  // such a report keeps both. The datum is known, so the owner can spend it.
  it('reports a deposit with an inline datum and its hash as a reserve, never as stranded', () => {
    const inlineDatumWithHash = custodyUtxo(17, {
      coins: 2_500_000n,
      datum: 42n,
      datumHash: DATUM_HASH,
    });

    const result = classify({ utxos: [controlUtxo(1), inlineDatumWithHash] });

    expect(result.reserves.foreign).toEqual([inlineDatumWithHash]);
    expect(result.stranded).toEqual([]);
  });

  it('lists a UTxO with an account token in a shape the contract rules out as an anomaly', () => {
    const otherAccountToken = Cardano.AssetId.fromParts(
      Cardano.PolicyId(ACCOUNT_VALIDATOR_HASH),
      Cardano.AssetName(`${'cd'.repeat(28)}00000000`),
    );
    const misplaced = custodyUtxo(18, {
      value: { coins: 2_000_000n, assets: new Map([[otherAccountToken, 1n]]) },
    });

    const result = classify({ utxos: [controlUtxo(1), misplaced, fund] });

    expect(result).toMatchObject({
      status: 'live',
      funds: [fund],
      grants: [],
      anomalies: [
        {
          code: 'unexpected-account-tokens',
          utxo: misplaced,
          assetIds: [otherAccountToken],
        },
      ],
    });
  });

  it('reports an account without a control UTxO as not created, still listing its deposits', () => {
    expect(classify({ utxos: [fund, stranded] })).toEqual({
      status: 'notCreated',
      funds: [fund],
      reserves: { own: [], foreign: [] },
      grants: [],
      grantLockedLovelace: 0n,
      stranded: [stranded],
      anomalies: [],
      withdrawableRewards: 0n,
    });
  });

  it('reports two control UTxOs as invalid', () => {
    const first = controlUtxo(1);
    const second = controlUtxo(2);

    expect(classify({ utxos: [first, fund, second] })).toEqual({
      status: 'invalid',
      reason: { code: 'multiple-control-utxos' },
      controlUtxos: [first, second],
      funds: [fund],
      reserves: { own: [], foreign: [] },
      grants: [],
      grantLockedLovelace: 0n,
      stranded: [],
      anomalies: [],
      withdrawableRewards: 0n,
    });
  });

  it('reports a control UTxO without an inline datum as invalid', () => {
    const control = custodyUtxo(1, {
      value: { coins: 1_500_000n, assets: new Map([[custodyStateNftId, 1n]]) },
      datumHash: DATUM_HASH,
    });

    expect(classify({ utxos: [control] })).toMatchObject({
      status: 'invalid',
      reason: { code: 'missing-inline-datum' },
      controlUtxos: [control],
      stranded: [],
    });
  });

  it('reports a control UTxO whose datum does not decode as invalid', () => {
    const control = custodyUtxo(1, {
      value: { coins: 1_500_000n, assets: new Map([[custodyStateNftId, 1n]]) },
      datum: 42n,
    });

    expect(classify({ utxos: [control] })).toMatchObject({
      status: 'invalid',
      reason: {
        code: 'undecodable-state',
        error: { code: 'malformed-data', path: '' },
      },
      controlUtxos: [control],
    });
  });

  describe('a control state under a logic outside the catalogue', () => {
    const UNKNOWN_LOGIC = HexBlob(
      '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d',
    );

    it('reports the account invalid, still listing every holding', () => {
      const control = controlUtxo(1, { ...custodyState, logic: UNKNOWN_LOGIC });

      expect(
        classify({
          utxos: [control, fund, ownReserve, agentGrant],
          withdrawableRewards: 9n,
        }),
      ).toEqual({
        status: 'invalid',
        reason: { code: 'unknown-logic', logic: UNKNOWN_LOGIC },
        controlUtxos: [control],
        funds: [fund],
        reserves: { own: [ownReserve], foreign: [] },
        grants: [expect.objectContaining({ utxo: agentGrant })],
        grantLockedLovelace: 1_700_000n,
        stranded: [],
        anomalies: [],
        withdrawableRewards: 9n,
      });
    });

    it('refuses it on the logic alone, whatever layout the other fields follow', () => {
      const control = custodyUtxo(1, {
        value: {
          coins: 1_500_000n,
          assets: new Map([[custodyStateNftId, 1n]]),
        },
        datum: {
          constructor: 0n,
          fields: { items: [Buffer.from(UNKNOWN_LOGIC, 'hex'), 42n] },
        },
      });

      expect(classify({ utxos: [control] })).toMatchObject({
        status: 'invalid',
        reason: { code: 'unknown-logic', logic: UNKNOWN_LOGIC },
      });
    });
  });

  it('reports a control datum whose first field is not a logic hash as undecodable', () => {
    const control = custodyUtxo(1, {
      value: { coins: 1_500_000n, assets: new Map([[custodyStateNftId, 1n]]) },
      datum: { constructor: 0n, fields: { items: [{ items: [] }] } },
    });

    expect(classify({ utxos: [control] })).toMatchObject({
      status: 'invalid',
      reason: {
        code: 'undecodable-state',
        error: { code: 'malformed-data', path: 'logic' },
      },
    });
  });

  it('reports a known logic with fields it cannot decode as undecodable', () => {
    const control = custodyUtxo(1, {
      value: { coins: 1_500_000n, assets: new Map([[custodyStateNftId, 1n]]) },
      datum: {
        constructor: 0n,
        fields: { items: [Buffer.from(custodyState.logic, 'hex'), 42n] },
      },
    });

    expect(classify({ utxos: [control] })).toMatchObject({
      status: 'invalid',
      reason: { code: 'undecodable-state' },
    });
  });

  it('ignores outputs not at the exact account address, even with its stake credential and NFT', () => {
    const foreignControl = custodyUtxo(3, {
      address: foreignPaymentAddress,
      value: { coins: 1_500_000n, assets: new Map([[custodyStateNftId, 1n]]) },
    });
    const foreignFund = custodyUtxo(4, { address: foreignPaymentAddress });

    expect(classify({ utxos: [foreignControl, foreignFund, fund] })).toEqual({
      status: 'notCreated',
      funds: [fund],
      reserves: { own: [], foreign: [] },
      grants: [],
      grantLockedLovelace: 0n,
      stranded: [],
      anomalies: [],
      withdrawableRewards: 0n,
    });
  });

  it('reports the bound device as unlisted when the state does not name it', () => {
    const result = classify({
      utxos: [
        controlUtxo(1, {
          ...custodyState,
          devices: [HexBlob(otherDeviceKeyHash)],
        }),
      ],
    });

    expect(result).toMatchObject({
      status: 'live',
      currentDeviceListed: false,
    });
  });

  it('matches the bound device key hash whatever its case', () => {
    const result = classify({
      account: {
        ...account,
        device: {
          ...account.device!,
          keyHash:
            custodyDeviceKeyHash.toUpperCase() as typeof custodyDeviceKeyHash,
        },
      },
      utxos: [controlUtxo(1)],
    });

    expect(result).toMatchObject({ currentDeviceListed: true });
  });

  it('reports no device listing for an observer, which has no device', () => {
    const result = classify({
      account: observerCustodyAccount.blockchainSpecific,
      utxos: [controlUtxo(1), fund],
    });

    expect(result.status).toBe('live');
    expect(result).not.toHaveProperty('currentDeviceListed');
    expect(result.funds).toEqual([fund]);
  });
});
