import * as Crypto from '@lace-lib/cardano-crypto';

import * as Cardano from '../../../src/Cardano';

describe('Cardano/types/Governance', () => {
  const credential: Cardano.Credential = {
    hash: Crypto.Hash28ByteBase16(
      'cb0ec2692497b458e46812c8a5bfa2931d1a2d965a99893828ec810f',
    ),
    type: Cardano.CredentialType.KeyHash,
  };
  const abstain: Cardano.AlwaysAbstain = { __typename: 'AlwaysAbstain' };
  const noConfidence: Cardano.AlwaysNoConfidence = {
    __typename: 'AlwaysNoConfidence',
  };
  const info = {
    active: true,
    id: 'drep1' as Cardano.DRepID,
  } as unknown as Parameters<typeof Cardano.isDrepInfo>[0];

  it('tells the four delegate representative shapes apart', () => {
    expect(Cardano.isDRepCredential(credential)).toBe(true);
    expect(Cardano.isDRepCredential(abstain)).toBe(false);
    expect(Cardano.isDRepCredential(info)).toBe(false);

    expect(Cardano.isDRepAlwaysAbstain(abstain)).toBe(true);
    expect(Cardano.isDRepAlwaysAbstain(noConfidence)).toBe(false);
    expect(Cardano.isDRepAlwaysAbstain(credential)).toBe(false);

    expect(Cardano.isDRepAlwaysNoConfidence(noConfidence)).toBe(true);
    expect(Cardano.isDRepAlwaysNoConfidence(abstain)).toBe(false);

    expect(Cardano.isDrepInfo(info)).toBe(true);
    expect(Cardano.isDrepInfo(credential)).toBe(false);
    expect(Cardano.isDrepInfo(abstain)).toBe(false);
  });
});
