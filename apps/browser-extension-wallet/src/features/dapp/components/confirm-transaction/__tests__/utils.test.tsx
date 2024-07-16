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
import * as Core from '@cardano-sdk/core';
import {
  certificateInspectorFactory,
  votingProceduresInspector,
  getTxType,
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

  test('testing getTxType', async () => {
    const tx = { body: {} } as Wallet.Cardano.Tx;
    const txInspectorCurriedFnPayload = { minted: [], burned: [] } as unknown as any;
    const createTxInspectorSpy = jest
      .spyOn(Core, 'createTxInspector')
      .mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, proposalProcedures: true }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.ProposalProcedures);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(1);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, votingProcedures: true }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.VotingProcedures);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(2);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, minted: { length: 1 } }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.Mint);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(3);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, burned: { length: 1 } }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.Burn);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(4);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, dRepRegistration: true }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.DRepRegistration);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(5);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, dRepRetirement: true }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.DRepRetirement);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(6);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, voteDelegation: true }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.VoteDelegation);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(7);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, dRepUpdate: true }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.DRepUpdate);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(8);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, stakeVoteDelegation: true }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.StakeVoteDelegation);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(9);

    createTxInspectorSpy.mockReturnValueOnce(() => ({
      ...txInspectorCurriedFnPayload,
      voteRegistrationDelegation: true
    }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.VoteRegistrationDelegation);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(10);

    createTxInspectorSpy.mockReturnValueOnce(() => ({
      ...txInspectorCurriedFnPayload,
      stakeRegistrationDelegation: true
    }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.StakeRegistrationDelegation);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(11);

    createTxInspectorSpy.mockReturnValueOnce(() => ({
      ...txInspectorCurriedFnPayload,
      stakeVoteDelegationRegistration: true
    }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.StakeVoteDelegationRegistration);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(12);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload }));
    expect(await getTxType(tx)).toEqual(Wallet.Cip30TxType.Send);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(13);
  });

  test('testing drepIDasBech32FromHash', () => {
    expect(
      Wallet.util.drepIDasBech32FromHash(
        '8293d319ef5b3ac72366dd28006bd315b715f7e7cfcbd3004129b80d' as Wallet.Crypto.Hash28ByteBase16
      )
    ).toEqual('drep1s2faxx00tvavwgmxm55qq67nzkm3tal8el9axqzp9xuq6s8s0wp');
  });

  test('testing pubDRepKeyToHash', async () => {
    const pubDRepKeyHex = '_pubDRepKeyHex';
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
