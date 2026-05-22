import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { addrToDisplay } from '../src/common/store/util';

const paymentAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp' as Cardano.PaymentAddress;

const rewardAccount =
  'stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn' as Cardano.RewardAccount;

const drepKeyHashHex =
  '17f45177b6d9bc795d3886e91c0e54108cc06035a2db8fa5c000cb6e';

describe('addrToDisplay', () => {
  it('returns payment addresses unchanged', () => {
    expect(addrToDisplay(paymentAddress)).toBe(paymentAddress);
  });

  it('returns reward addresses unchanged', () => {
    expect(addrToDisplay(rewardAccount)).toBe(rewardAccount);
  });

  it('encodes a DRep keyhash hex as a CIP-129 DRep ID (LW-14948)', () => {
    const result = addrToDisplay(drepKeyHashHex);
    expect(result.startsWith('drep1')).toBe(true);
    const credential = Cardano.DRepID.toCredential(Cardano.DRepID(result));
    expect(credential.hash).toBe(drepKeyHashHex);
    expect(credential.type).toBe(Cardano.CredentialType.KeyHash);
  });

  it('returns the original input when the format is not recognised', () => {
    expect(addrToDisplay('not-a-valid-address')).toBe('not-a-valid-address');
  });
});
