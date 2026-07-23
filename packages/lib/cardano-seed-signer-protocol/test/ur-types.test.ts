import { describe, expect, it } from 'vitest';

import { CardanoUrType } from '../src/ur-types';

describe('CardanoUrType', () => {
  it('matches the firmware QRType strings exactly', () => {
    expect(CardanoUrType).toEqual({
      AccountRequest: 'cardano-account-req',
      Account: 'cardano-account',
      TxSignRequest: 'cardano-tx-sig-req',
      TxSignResponse: 'cardano-tx-sig-res',
      Cip8SignRequest: 'cardano-cip8-sig-req',
      Cip8SignResponse: 'cardano-cip8-sig-res',
    });
  });
});
