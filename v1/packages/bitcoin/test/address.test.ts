/* eslint-disable no-magic-numbers, no-loop-func */
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import { Network } from '../src/wallet/lib/common/network';
import {
  AddressType,
  deriveAddressByType,
  validateBitcoinAddress,
  AddressValidationResult,
  isP2trAddress
} from '../src/wallet/lib/common/address';

bitcoin.initEccLib(ecc);

const networkMap: Record<string, bitcoin.Network> = {
  mainnet: bitcoin.networks.bitcoin,
  testnet: bitcoin.networks.testnet
};

const addressTypeMap: Record<string, AddressType> = {
  p2pkh: AddressType.Legacy,
  'p2sh-p2wpkh': AddressType.SegWit,
  p2wpkh: AddressType.NativeSegWit,
  p2tr: AddressType.Taproot
};

type Vector = {
  privateKey?: string;
  publicKey: string;
  address: string;
  network: string;
  format: string;
};

// Test vectors taken from https://github.com/hirosystems/stacks-blockchain-api/blob/ae0eb65c4d6901db172f2b4ea751817d8ef8c05c/src/tests/helpers-tests.ts#L193-L530
const TEST_VECTORS: Vector[] = [
  {
    publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
    network: 'mainnet',
    format: 'p2pkh'
  },
  {
    publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    address: '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
    network: 'mainnet',
    format: 'p2sh-p2wpkh'
  },
  {
    publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    network: 'mainnet',
    format: 'p2wpkh'
  },
  {
    publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    address: 'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9',
    network: 'mainnet',
    format: 'p2tr'
  },
  {
    publicKey: '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41',
    address: '2NEb2fNbJXdwi7EC6vKCjWUTA12PABNniQM',
    network: 'testnet',
    format: 'p2sh-p2wpkh'
  },
  {
    publicKey: '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41',
    address: 'tb1qzepy04hjksj6c4m3ggawdjqvw48hzu4swvwmvt',
    network: 'testnet',
    format: 'p2wpkh'
  },
  {
    publicKey: '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41',
    address: 'tb1p8dlmzllfah294ntwatr8j5uuvcj7yg0dete94ck2krrk0ka2c9qqex96hv',
    network: 'testnet',
    format: 'p2tr'
  }
];

describe('Addresses', () => {
  describe('Bitcoin address derivation (from test vectors)', () => {
    for (const vector of TEST_VECTORS) {
      const { publicKey, address, network, format } = vector;

      const testName = `${format.toUpperCase()} | ${network} | ${publicKey.slice(0, 10)}...`;
      const addressType = addressTypeMap[format];

      it(`produces correct address: ${testName}`, () => {
        const derived = deriveAddressByType(Buffer.from(publicKey, 'hex'), addressType, networkMap[network]);
        expect(derived).toBe(address);
      });
    }
  });

  describe('validateBitcoinAddress', () => {
    it('validates a correct legacy address (Mainnet)', () => {
      expect(validateBitcoinAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', Network.Mainnet)).toBe(
        AddressValidationResult.Valid
      );
    });

    it('validates a correct native segwit address (Mainnet)', () => {
      expect(validateBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', Network.Mainnet)).toBe(
        AddressValidationResult.Valid
      );
    });

    it('validates a correct taproot address (Mainnet)', () => {
      expect(
        validateBitcoinAddress('bc1pemwrzunpf5tj70s6vkxysf2v8njg60kpc2mvuccath5kfw3zd6jqv9lks9', Network.Mainnet)
      ).toBe(AddressValidationResult.Valid);
    });

    it('returns InvalidNetwork for valid testnet address on mainnet', () => {
      expect(
        validateBitcoinAddress('tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c', Network.Mainnet)
      ).toBe(AddressValidationResult.InvalidNetwork);
    });

    it('validates a correct legacy address (Testnet)', () => {
      expect(validateBitcoinAddress('mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn', Network.Testnet)).toBe(
        AddressValidationResult.Valid
      );
    });

    it('validates a correct native segwit address (Testnet)', () => {
      expect(validateBitcoinAddress('tb1q597d0yvt3mg3k9p5qtkz8lh3j53nsssr57wnfr', Network.Testnet)).toBe(
        AddressValidationResult.Valid
      );
    });

    it('validates a correct taproot address (Testnet)', () => {
      expect(
        validateBitcoinAddress('tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c', Network.Testnet)
      ).toBe(AddressValidationResult.Valid);
    });

    it('returns InvalidNetwork for valid mainnet address on testnet', () => {
      expect(
        validateBitcoinAddress('bc1pemwrzunpf5tj70s6vkxysf2v8njg60kpc2mvuccath5kfw3zd6jqv9lks9', Network.Testnet)
      ).toBe(AddressValidationResult.InvalidNetwork);
    });

    it('returns InvalidAddress for malformed address', () => {
      expect(validateBitcoinAddress('notARealAddress', Network.Mainnet)).toBe(AddressValidationResult.InvalidAddress);
    });
  });

  describe('isP2trAddress', () => {
    it('identifies P2TR address correctly', () => {
      expect(isP2trAddress('bc1pmyrcn4jl9x8gtz8wjyqchghzq39kech5xg99snm4a3p2l3thf4esfp20h9')).toBe(true);
      expect(isP2trAddress('tb1pmyrcn4jl9x8gtz8wjyqchghzq39kech5xg99snm4a3p2l3thf4esfp20h9')).toBe(true);
    });

    it('rejects non-taproot address', () => {
      expect(isP2trAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(false);
    });
  });
});
