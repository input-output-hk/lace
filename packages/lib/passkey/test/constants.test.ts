import { describe, expect, it } from 'vitest';

import {
  HKDF_RECORD_KEY_INFO,
  HKDF_WALLET_ENTROPY_INFO,
  PRF_SALT_AUTHORISER_LABEL,
  PRF_SALT_ROOT_LABEL,
} from '../src';

describe('domain-separation labels', () => {
  it('pins the record-key HKDF info label', () => {
    expect(HKDF_RECORD_KEY_INFO).toBe('lace-passport/hkdf/record-key/v1');
    expect(HKDF_WALLET_ENTROPY_INFO).toBe('lace/hkdf/wallet-entropy/v1');
    expect(PRF_SALT_AUTHORISER_LABEL).toBe('lace-passport/prf/authoriser/v1');
    expect(PRF_SALT_ROOT_LABEL).toBe('lace/prf/root/v1');
  });
});
