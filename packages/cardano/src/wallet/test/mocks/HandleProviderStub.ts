/* eslint-disable no-magic-numbers */
import { Cardano, HandleProvider } from '@cardano-sdk/core';

export const handleProviderStub = (): HandleProvider => ({
  getPolicyIds: jest.fn().mockResolvedValue(['stub_policy_id' as Cardano.PolicyId]),
  healthCheck: jest.fn().mockResolvedValue({ ok: true }),
  resolveHandles: jest.fn().mockResolvedValue([
    {
      cardanoAddress:
        'addr1q836sqrf2q99lqrlw59hpmk04csadszdt8rfyksyfnf5x9jgefjct90n965wvkkd4d54kax5zzvvnep5h4hwsk33pr8sgz45a2',
      defaultForPaymentCredential: '13',
      defaultForStakeCredential: '13',
      handle: 'test',
      hasDatum: false,
      image: 'ipfs://QmUZNDMwVhAsSDx8HKNhpeYG2CcdU88QFsHfDyNne9Ehna',
      // eslint-disable-next-line unicorn/no-null
      parentHandle: null,
      policyId: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a',
      resolvedAt: {
        hash: 'a794fb70ebead0cdb5963c62474735b4e855f8656c281163a5a010d9884c99ac',
        slot: 156_275_693
      }
    }
  ])
});
