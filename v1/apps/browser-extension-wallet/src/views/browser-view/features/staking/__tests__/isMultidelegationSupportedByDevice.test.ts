/* eslint-disable import/imports-first */
const initConnectionAndGetSoftwareVersionMock = jest.fn();

import {
  LedgerMultidelegationMinAppVersion,
  isMultidelegationSupportedByDevice
} from '../isMultidelegationSupportedByDevice';
import { WalletType } from '@cardano-sdk/web-extension';

jest.mock('@lace/cardano', () => ({
  Wallet: {
    initConnectionAndGetSoftwareVersion: initConnectionAndGetSoftwareVersionMock
  }
}));

describe('isMultidelegationSupportedByDevice', () => {
  it('calls Wallet.isMultidelegationSupportedByDevice to get a version', async () => {
    initConnectionAndGetSoftwareVersionMock.mockResolvedValue({
      major: 0,
      minor: 0,
      patch: 0
    });
    await isMultidelegationSupportedByDevice(WalletType.Ledger);
    expect(initConnectionAndGetSoftwareVersionMock).toHaveBeenCalledWith(WalletType.Ledger);
  });

  it('returns false if the version is lower than expected', async () => {
    initConnectionAndGetSoftwareVersionMock.mockResolvedValue({
      major: 0,
      minor: 0,
      patch: 0
    });
    expect(await isMultidelegationSupportedByDevice(WalletType.Trezor)).toEqual(false);
  });

  it('returns true if the version is greater on the major level', async () => {
    initConnectionAndGetSoftwareVersionMock.mockResolvedValue({
      major: LedgerMultidelegationMinAppVersion.MAJOR + 1,
      minor: 0,
      patch: 0
    });
    expect(await isMultidelegationSupportedByDevice(WalletType.Ledger)).toEqual(true);
  });

  it('returns true if the version is greater on the minor level', async () => {
    initConnectionAndGetSoftwareVersionMock.mockResolvedValue({
      major: LedgerMultidelegationMinAppVersion.MAJOR,
      minor: LedgerMultidelegationMinAppVersion.MINOR + 1,
      patch: 0
    });
    expect(await isMultidelegationSupportedByDevice(WalletType.Ledger)).toEqual(true);
  });

  it('returns true if the version is greater on the patch level', async () => {
    initConnectionAndGetSoftwareVersionMock.mockResolvedValue({
      major: LedgerMultidelegationMinAppVersion.MAJOR,
      minor: LedgerMultidelegationMinAppVersion.MINOR,
      patch: LedgerMultidelegationMinAppVersion.PATCH + 1
    });
    expect(await isMultidelegationSupportedByDevice(WalletType.Ledger)).toEqual(true);
  });

  it('returns true if the version is equal to the minimal required', async () => {
    initConnectionAndGetSoftwareVersionMock.mockResolvedValue({
      major: LedgerMultidelegationMinAppVersion.MAJOR,
      minor: LedgerMultidelegationMinAppVersion.MINOR,
      patch: LedgerMultidelegationMinAppVersion.PATCH
    });
    expect(await isMultidelegationSupportedByDevice(WalletType.Trezor)).toEqual(true);
  });
});
