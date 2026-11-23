import { MidnightBech32m } from '@midnightntwrk/wallet-sdk-address-format';
import { describe, expect, it, vi } from 'vitest';

import {
  getAddressType,
  isDustAddress,
  isShieldedAddress,
  isUnshieldedAddress,
} from '../src/address-util';

import type { Logger } from 'ts-log';

describe('isShieldedAddress', () => {
  describe('valid shielded addresses', () => {
    it('should return true for mainnet shielded address', () => {
      const address =
        'mn_shield-addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwg3rhyzg';

      expect(isShieldedAddress(address, 'mainnet')).toBe(true);
    });

    it('should return true for preprod network shielded address', () => {
      const address =
        'mn_shield-addr_preprod1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwgudgkts';

      expect(isShieldedAddress(address, 'preprod')).toBe(true);
    });

    it('should return true for preview network shielded address', () => {
      const address =
        'mn_shield-addr_preview1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwgrqq7xz';

      expect(isShieldedAddress(address, 'preview')).toBe(true);
    });

    it('should return true for undeployed network shielded address', () => {
      const address =
        'mn_shield-addr_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwg9fm0hc';

      expect(isShieldedAddress(address, 'undeployed')).toBe(true);
    });
  });

  describe('invalid shielded addresses', () => {
    it.each([32, 63, 65, 66])(
      'rejects a checksummed shielded address with a %i-byte payload',
      length => {
        const address = new MidnightBech32m(
          'shield-addr',
          'preview',
          Buffer.alloc(length, 1),
        ).toString();
        expect(isShieldedAddress(address, 'preview')).toBe(false);
      },
    );

    it('should return false for unshielded address', () => {
      const address =
        'mn_addr_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqy6sh';
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isShieldedAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for dust address', () => {
      const address =
        'mn_dust_undeployed1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpt2';
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isShieldedAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for address with wrong prefix', () => {
      const address =
        'mn_addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwvucsy9kffv';
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isShieldedAddress(address, 'mainnet', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it.each(['preprod', 'preview', 'undeployed'] as const)(
      'should return false for mainnet shielded address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_shield-addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwg3rhyzg';
        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isShieldedAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it.each(['mainnet', 'preview', 'undeployed'] as const)(
      'should return false for preprod shielded address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_shield-addr_preprod1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwgudgkts';
        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isShieldedAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
        expect(isShieldedAddress(address, networkId)).toBe(false);
      },
    );

    it.each(['mainnet', 'preprod', 'undeployed'] as const)(
      'should return false for preview shielded address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_shield-addr_preview1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwgrqq7xz';

        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isShieldedAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it.each(['mainnet', 'preprod', 'preview'] as const)(
      'should return false for undeployed shielded address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_shield-addr_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwg9fm0hc';

        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isShieldedAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it('should return false for address too short (less than 80 chars after prefix)', () => {
      const address =
        'mn_shield-addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva';
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isShieldedAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for address too long (more than 150 chars after prefix)', () => {
      const address =
        'mn_shield-addr1' +
        'mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwvucsy9kffvmjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwvucsy9kffv';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isShieldedAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for address with invalid bech32 characters', () => {
      const address =
        'mn_shield-addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwvucsy9kffvBIO';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isShieldedAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for empty string', () => {
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isShieldedAddress('', 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for completely invalid format', () => {
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isShieldedAddress('not-an-address', 'undeployed', logger)).toBe(
        false,
      );
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

describe('isUnshieldedAddress', () => {
  describe('valid unshielded addresses', () => {
    it('should return true for mainnet unshielded address', () => {
      const address =
        'mn_addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0s6rzy44';

      expect(isUnshieldedAddress(address, 'mainnet')).toBe(true);
    });

    it('should return true for preprod network unshielded address', () => {
      const address =
        'mn_addr_preprod1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sphkkkz';

      expect(isUnshieldedAddress(address, 'preprod')).toBe(true);
    });

    it('should return true for preview network unshielded address', () => {
      const address =
        'mn_addr_preview1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0spkgx9l';

      expect(isUnshieldedAddress(address, 'preview')).toBe(true);
    });

    it('should return true for undeployed network unshielded address', () => {
      const address =
        'mn_addr_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0smvvg8n';

      expect(isUnshieldedAddress(address, 'undeployed')).toBe(true);
    });
  });

  describe('invalid unshielded addresses', () => {
    it('should return false for shielded address', () => {
      const address =
        'mn_shield-addr_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwg9fm0hc';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isUnshieldedAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for dust address', () => {
      const address =
        'mn_dust_undeployed1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpt2';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isUnshieldedAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for address with wrong prefix', () => {
      const address =
        'mn_dust1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqy6sh';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isUnshieldedAddress(address, 'mainnet', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it.each(['preprod', 'preview', 'undeployed'] as const)(
      'should return false for mainnet unshielded address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0s6rzy44';
        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isUnshieldedAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it.each(['mainnet', 'preview', 'undeployed'] as const)(
      'should return false for preprod unshielded address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_addr_preprod1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sphkkkz';
        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isUnshieldedAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it.each(['mainnet', 'preprod', 'undeployed'] as const)(
      'should return false for preview unshielded address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_addr_preview1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0spkgx9l';

        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isUnshieldedAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it.each(['mainnet', 'preprod', 'preview'] as const)(
      'should return false for undeployed unshielded address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_addr_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0smvvg8n';

        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isUnshieldedAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it('should return false for address with wrong length (not 58 chars after prefix)', () => {
      const address =
        'mn_addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxq';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isUnshieldedAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for address with invalid bech32 characters', () => {
      const address =
        'mn_addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqBIO1';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isUnshieldedAddress(address, 'mainnet', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for empty string', () => {
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isUnshieldedAddress('', 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for completely invalid format', () => {
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isUnshieldedAddress('not-an-address', 'undeployed', logger)).toBe(
        false,
      );
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

describe('isDustAddress', () => {
  describe('valid dust addresses', () => {
    it('should return true for mainnet dust address', () => {
      const address =
        'mn_dust1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzgdspqv';

      expect(isDustAddress(address, 'mainnet')).toBe(true);
    });

    it('should return true for preprod network dust address', () => {
      const address =
        'mn_dust_preprod1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzuryfr2';

      expect(isDustAddress(address, 'preprod')).toBe(true);
    });

    it('should return true for preview network dust address', () => {
      const address =
        'mn_dust_preview1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzaa5672';

      expect(isDustAddress(address, 'preview')).toBe(true);
    });

    it('should return true for undeployed network dust address', () => {
      const address =
        'mn_dust_undeployed1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpt2';

      expect(isDustAddress(address, 'undeployed')).toBe(true);
    });
  });

  describe('invalid dust addresses', () => {
    it('should return false for shielded address', () => {
      const address =
        'mn_shield-addr_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwg9fm0hc';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isDustAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for unshielded address', () => {
      const address =
        'mn_addr_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0smvvg8n';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isDustAddress(address, 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for address with wrong prefix', () => {
      const address =
        'mn_addr1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpt2';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isDustAddress(address, 'mainnet', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it.each(['preprod', 'preview', 'undeployed'] as const)(
      'should return false for mainnet dust address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_dust1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzgdspqv';
        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isDustAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it.each(['mainnet', 'preview', 'undeployed'] as const)(
      'should return false for preprod dust address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_dust_preprod1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzuryfr2';
        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isDustAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it.each(['mainnet', 'preprod', 'undeployed'] as const)(
      'should return false for preview dust address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_dust_preview1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzaa5672';

        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isDustAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it.each(['mainnet', 'preprod', 'preview'] as const)(
      'should return false for undeployed dust address targeting wrong network: %s',
      networkId => {
        const address =
          'mn_dust_undeployed1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpt2';

        const error = vi.fn();
        const logger: Logger = { error } as unknown as Logger;
        expect(isDustAddress(address, networkId, logger)).toBe(false);
        expect(error).toHaveBeenCalledWith(expect.any(Error));
      },
    );

    it('should return false for address with wrong length (not 59 chars after prefix)', () => {
      const address =
        'mn_dust1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isDustAddress(address, 'mainnet', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for address with invalid bech32 characters', () => {
      const address =
        'mn_dust1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpBIO';

      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isDustAddress(address, 'mainnet', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for empty string', () => {
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isDustAddress('', 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return false for completely invalid format', () => {
      const error = vi.fn();
      const logger: Logger = { error } as unknown as Logger;
      expect(isDustAddress('not-an-address', 'undeployed', logger)).toBe(false);
      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

describe('getAddressType', () => {
  it("should return 'shielded' address type", () => {
    const address =
      'mn_shield-addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwg3rhyzg';

    expect(getAddressType(address, 'mainnet')).toEqual('shielded');
  });

  it("should return 'unshielded' address type", () => {
    const address =
      'mn_addr1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0s6rzy44';

    expect(getAddressType(address, 'mainnet')).toEqual('unshielded');
  });

  it("should return 'dust' address type", () => {
    const address =
      'mn_dust1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzgdspqv';

    expect(getAddressType(address, 'mainnet')).toEqual('dust');
  });

  it('should throw error for invalid address', () => {
    const invalidAddress = 'invalid-address';

    expect(() => getAddressType(invalidAddress, 'mainnet')).toThrow(
      'Invalid Midnight address',
    );
  });
});
