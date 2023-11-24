/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable import/imports-first */
const mockDRepID = jest.fn();
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
  TxType,
  getTitleKey,
  certificateInspectorFactory,
  votingProceduresInspector,
  getTxType,
  getOwnRetirementMessageKey,
  drepIDasBech32FromHash,
  pubDRepKeyToHash
} from '../utils';
import { DAPP_VIEWS, sectionTitle } from '@src/features/dapp/config';

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
        ...actual.Wallet.Cardano,
        DRepID: mockDRepID
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

  test('testing getVoterType', () => {
    let txType = TxType.DRepRegistration;
    expect(getTitleKey(txType)).toEqual(`core.${txType}.title`);
    txType = TxType.DRepRetirement;
    expect(getTitleKey(txType)).toEqual(`core.${txType}.title`);
    txType = TxType.DRepUpdate;
    expect(getTitleKey(txType)).toEqual(`core.${txType}.title`);
    txType = TxType.VoteDelegation;
    expect(getTitleKey(txType)).toEqual(`core.${txType}.title`);
    txType = TxType.VotingProcedures;
    expect(getTitleKey(txType)).toEqual(`core.${txType}.title`);
    txType = 'other' as TxType;
    expect(getTitleKey(txType)).toEqual(sectionTitle[DAPP_VIEWS.CONFIRM_TX]);
  });

  test('testing certificateInspectorFactory', () => {
    const VoteDelegationCertificate = { __typename: Wallet.Cardano.CertificateType.VoteDelegation };
    expect(
      certificateInspectorFactory(Wallet.Cardano.CertificateType.VoteDelegation)({
        body: { certificates: [VoteDelegationCertificate] }
      } as Wallet.Cardano.Tx)
    ).toEqual(VoteDelegationCertificate);
    expect(
      certificateInspectorFactory(Wallet.Cardano.CertificateType.VoteRegistrationDelegation)({
        body: { certificates: [VoteDelegationCertificate] }
      } as Wallet.Cardano.Tx)
    ).toEqual(undefined);
  });

  test('testing votingProceduresInspector', () => {
    const votingProcedures = 'votingProcedures';
    expect(votingProceduresInspector({ body: { votingProcedures } } as unknown as Wallet.Cardano.Tx)).toEqual(
      votingProcedures
    );
    expect(votingProceduresInspector({ body: {} } as Wallet.Cardano.Tx)).toEqual(undefined);
  });

  test('testing getTxType', () => {
    const tx = { body: {} } as Wallet.Cardano.Tx;
    const txInspectorCurriedFnPayload = { minted: [], burned: [] } as unknown as any;
    const createTxInspectorSpy = jest
      .spyOn(Core, 'createTxInspector')
      .mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, votingProcedures: true }));
    expect(getTxType(tx)).toEqual(TxType.VotingProcedures);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(1);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, minted: { length: 1 } }));
    expect(getTxType(tx)).toEqual(TxType.Mint);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(2);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, burned: { length: 1 } }));
    expect(getTxType(tx)).toEqual(TxType.Burn);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(3);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, dRepRegistration: true }));
    expect(getTxType(tx)).toEqual(TxType.DRepRegistration);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(4);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, dRepRetirement: true }));
    expect(getTxType(tx)).toEqual(TxType.DRepRetirement);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(5);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, voteDelegation: true }));
    expect(getTxType(tx)).toEqual(TxType.VoteDelegation);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(6);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload, dRepUpdate: true }));
    expect(getTxType(tx)).toEqual(TxType.DRepUpdate);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(7);

    createTxInspectorSpy.mockReturnValueOnce(() => ({ ...txInspectorCurriedFnPayload }));
    expect(getTxType(tx)).toEqual(TxType.Send);
    expect(createTxInspectorSpy).toHaveBeenCalledTimes(8);
  });

  test('testing drepIDasBech32FromHash', () => {
    mockDRepID.mockReset();
    mockDRepID.mockImplementation((val) => val);

    const drepID = '_drepID';
    expect(drepIDasBech32FromHash(drepID as Wallet.Crypto.Hash28ByteBase16)).toEqual(`drep${drepID}`);
  });

  test('testing pubDRepKeyToHash', async () => {
    const pubDRepKeyHex = '_pubDRepKeyHex';
    expect(await pubDRepKeyToHash(pubDRepKeyHex as Wallet.Crypto.Ed25519PublicKeyHex)).toEqual(pubDRepKeyHex);
  });

  test('testing getOwnRetirementMessageKey', () => {
    expect(getOwnRetirementMessageKey(undefined)).toEqual('');
    expect(getOwnRetirementMessageKey(true)).toEqual('core.DRepRetirement.isOwnRetirement');
    expect(getOwnRetirementMessageKey(false)).toEqual('core.DRepRetirement.isNotOwnRetirement');
  });
});
