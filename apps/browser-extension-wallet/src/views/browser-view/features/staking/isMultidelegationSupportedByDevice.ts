/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { WalletType } from '@cardano-sdk/web-extension';

export enum LedgerMultidelegationMinAppVersion {
  MAJOR = 6,
  MINOR = 1,
  PATCH = 2
}

export enum TrezorMultidelegationFirmwareMinVersion {
  MAJOR = 2,
  MINOR = 6,
  PATCH = 4
}

export const isMultidelegationSupportedByDevice = async (walletType: Wallet.HardwareWallets): Promise<boolean> => {
  const version = await Wallet.initConnectionAndGetSoftwareVersion(walletType);
  const expectedVersion =
    walletType === WalletType.Ledger ? LedgerMultidelegationMinAppVersion : TrezorMultidelegationFirmwareMinVersion;

  const higherOnMajor = version.major > expectedVersion.MAJOR;
  const higherOnMinor = version.major === expectedVersion.MAJOR && version.minor > expectedVersion.MINOR;
  const higherOrEqualOnPatch =
    version.major === expectedVersion.MAJOR &&
    version.minor === expectedVersion.MINOR &&
    version.patch >= expectedVersion.PATCH;

  return higherOnMajor || higherOnMinor || higherOrEqualOnPatch;
};
