import { AddressType, Bip32Account, util } from '../src';

import { testKeyAgent } from './mocks';

describe('Bip32Account.fromAsyncKeyAgent', () => {
  it('derives the addresses the key agent derives', async () => {
    const keyAgent = await testKeyAgent();
    const account = await Bip32Account.fromAsyncKeyAgent(
      util.createAsyncKeyAgent(keyAgent),
    );
    const derivationPath = { index: 1, type: AddressType.External };
    const fromAccount = await account.deriveAddress(derivationPath, 0);
    const fromKeyAgent = await keyAgent.deriveAddress(derivationPath, 0);
    expect(fromAccount.address).toBe(fromKeyAgent.address);
    expect(fromAccount.rewardAccount).toBe(fromKeyAgent.rewardAccount);
  });
});
