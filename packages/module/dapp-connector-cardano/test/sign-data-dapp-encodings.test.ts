import { Cardano } from '@cardano-sdk/core';
import { cip8SignData } from '@lace-contract/cardano-context';
import { describe, expect, it, vi } from 'vitest';

import { addrToSignWith } from '../src/common/store/util';

import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';

/**
 * Composed coverage of the seam between addrToSignWith (encoding
 * normalisation) and cip8SignData (signer resolution): each layer is unit
 * tested in isolation, so a change to either could break real dApp requests
 * with both suites green. Inputs replay the literal signData `addr` shapes
 * the governance dApps send: GovTool and tempo.vote sign with a hex reward
 * address; dreptalk.com sends the raw DRep key hash, then a hex type-6
 * enterprise address. The bech32 DRep IDs cover CIP-105/CIP-129 senders.
 */
describe('signData encodings governance dApps send', () => {
  const paymentAddress = Cardano.PaymentAddress(
    'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
  );
  const rewardAccount = Cardano.RewardAccount(
    'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
  );
  const rewardAccountHex = Cardano.Address.fromBech32(rewardAccount).toBytes();

  const dRepKeyHash =
    '7ac54bcbbdbb1c4f3bbd664e02058a4b3b0e5da2a1b1e12b8813f76e' as Ed25519KeyHashHex;
  const dRepCredential = {
    type: Cardano.CredentialType.KeyHash,
    hash: dRepKeyHash,
  };
  const dRepIdCip129 = Cardano.DRepID.cip129FromCredential(dRepCredential);
  const dRepIdCip105 = Cardano.DRepID.cip105FromCredential(dRepCredential);

  const knownAddresses: GroupedAddress[] = [
    {
      type: 0,
      index: 0,
      networkId: 0,
      accountIndex: 0,
      address: paymentAddress,
      rewardAccount,
      stakeKeyDerivationPath: { role: 2, index: 0 },
    } as GroupedAddress,
  ];

  const signAndCaptureRole = async (dAppAddr: string) => {
    const signBlob = vi.fn().mockResolvedValue({
      signature: 'ab'.repeat(64),
      publicKey: 'cd'.repeat(32),
    });
    const result = await cip8SignData({
      keyAgent: { signBlob },
      request: { signWith: addrToSignWith(dAppAddr), payload: 'deadbeef' },
      knownAddresses,
      dRepKeyHash,
    });
    expect(signBlob).toHaveBeenCalledTimes(1);
    return {
      derivationPath: signBlob.mock.calls[0][0] as {
        role: number;
        index: number;
      },
      result,
    };
  };

  it.each([
    ['GovTool/Tempo hex reward address', String(rewardAccountHex)],
    ['bech32 reward account', String(rewardAccount)],
  ])('%s signs with the stake key (role 2)', async (_label, addr) => {
    const { derivationPath } = await signAndCaptureRole(addr);
    expect(derivationPath).toEqual({ role: 2, index: 0 });
  });

  it.each([
    ['dreptalk raw DRep key hash', String(dRepKeyHash)],
    ['dreptalk hex type-6 enterprise (testnet)', `60${dRepKeyHash}`],
    ['hex type-6 enterprise (mainnet)', `61${dRepKeyHash}`],
    ['CIP-105 bech32 DRep ID', String(dRepIdCip105)],
    ['CIP-129 bech32 DRep ID', String(dRepIdCip129)],
  ])('%s signs with the DRep key (role 3)', async (_label, addr) => {
    const { derivationPath, result } = await signAndCaptureRole(addr);
    expect(derivationPath).toEqual({ role: 3, index: 0 });
    // DRep framing binds the raw 28-byte key hash into the COSE_Key kid.
    expect(String(result.key)).toContain(String(dRepKeyHash));
  });

  it('bech32 payment address signs with the payment key (role 0)', async () => {
    const { derivationPath } = await signAndCaptureRole(String(paymentAddress));
    expect(derivationPath).toEqual({ role: 0, index: 0 });
  });

  it('hex payment address signs with the payment key (role 0)', async () => {
    const paymentAddressHex = String(
      Cardano.Address.fromBech32(paymentAddress).toBytes(),
    );
    const { derivationPath } = await signAndCaptureRole(paymentAddressHex);
    expect(derivationPath).toEqual({ role: 0, index: 0 });
  });

  it('a foreign reward account is refused, not signed with stake key 0', async () => {
    const signBlob = vi.fn();
    const foreignRewardAccount =
      'stake_test1urc4mvzl2cp4gedl3yq2px7659krmzuzgnl2dpjjgsydmqqxgamj7';
    await expect(
      cip8SignData({
        keyAgent: { signBlob },
        request: {
          signWith: addrToSignWith(foreignRewardAccount),
          payload: 'deadbeef',
        },
        knownAddresses,
        dRepKeyHash,
      }),
    ).rejects.toThrow(/Unknown signWith reward account/);
    expect(signBlob).not.toHaveBeenCalled();
  });

  it('a foreign DRep key hash is refused, not signed with a fallback key', async () => {
    const signBlob = vi.fn();
    await expect(
      cip8SignData({
        keyAgent: { signBlob },
        request: {
          signWith: addrToSignWith('b'.repeat(56)),
          payload: 'deadbeef',
        },
        knownAddresses,
        dRepKeyHash,
      }),
    ).rejects.toThrow(/Unknown signWith address/);
    expect(signBlob).not.toHaveBeenCalled();
  });
});
