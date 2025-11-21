/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable import/imports-first */
const mockHexBlob = (val: string) => val;
mockHexBlob.toTypedBech32 = (prefix: string, value: string) => `${prefix}${value}`;
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
/* eslint-disable max-statements */
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Wallet } from '@lace/cardano';
import {
  certificateInspectorFactory,
  votingProceduresInspector,
  pubDRepKeyToHash,
  depositPaidWithSymbol
} from '../utils';

jest.mock('@cardano-sdk/core', () => ({
  ...jest.requireActual<any>('@cardano-sdk/core'),
  createTxInspector: jest.fn()
}));

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      Cardano: {
        ...actual.Wallet.Cardano
      },
      HexBlob: mockHexBlob,
      Crypto: {
        ...actual.Wallet.Crypto,
        Hash28ByteBase16: {
          ...actual.Wallet.Crypto.Hash28ByteBase16,
          fromEd25519KeyHashHex: (drepKeyHex: string) => drepKeyHex
        },
        Ed25519PublicKey: {
          ...actual.Wallet.Crypto.Ed25519PublicKey,
          fromHex: async (val: string) => await { hash: async () => await { hex: () => val } }
        }
      }
    }
  };
});

describe('Testing utils', () => {
  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('testing certificateInspectorFactory', async () => {
    const VoteDelegationCertificate = { __typename: Wallet.Cardano.CertificateType.VoteDelegation };
    expect(
      await certificateInspectorFactory(Wallet.Cardano.CertificateType.VoteDelegation)({
        body: { certificates: [VoteDelegationCertificate] }
      } as Wallet.Cardano.Tx)
    ).toEqual(VoteDelegationCertificate);
    expect(
      await certificateInspectorFactory(Wallet.Cardano.CertificateType.VoteRegistrationDelegation)({
        body: { certificates: [VoteDelegationCertificate] }
      } as Wallet.Cardano.Tx)
    ).toEqual(undefined);
  });

  test('testing votingProceduresInspector', async () => {
    const votingProcedures = 'votingProcedures';
    expect(await votingProceduresInspector({ body: { votingProcedures } } as unknown as Wallet.Cardano.Tx)).toEqual(
      votingProcedures
    );
    expect(await votingProceduresInspector({ body: {} } as Wallet.Cardano.Tx)).toEqual(undefined);
  });

  test('testing drepIDasBech32FromHash', () => {
    expect(
      Wallet.util.drepIDasBech32FromHash(
        '8293d319ef5b3ac72366dd28006bd315b715f7e7cfcbd3004129b80d' as Wallet.Crypto.Hash28ByteBase16
      )
    ).toEqual('drep1s2faxx00tvavwgmxm55qq67nzkm3tal8el9axqzp9xuq6s8s0wp');
  });

  test('testing pubDRepKeyToHash', async () => {
    const pubDRepKeyHex = '8293d319ef5b3ac72366dd28006bd315b715f7e7cfcbd3004129b80d';
    expect(await pubDRepKeyToHash(pubDRepKeyHex as Wallet.Crypto.Ed25519PublicKeyHex)).toEqual(pubDRepKeyHex);
  });

  test('depositPaidWithSymbol', () => {
    expect(depositPaidWithSymbol(BigInt(20_000), { name: 'Cardano', symbol: 'ada' } as Wallet.CoinId)).toEqual(
      '0.02 ada'
    );

    expect(() => depositPaidWithSymbol(BigInt(20_000), { name: 'Unknown', symbol: 'UNK' } as Wallet.CoinId)).toThrow(
      'coinId Unknown not supported'
    );
  });
});
