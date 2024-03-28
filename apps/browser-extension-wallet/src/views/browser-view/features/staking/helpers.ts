/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import * as HardwareLedger from '@cardano-sdk/hardware-ledger';
import * as HardwareTrezor from '@cardano-sdk/hardware-trezor';
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

export const isMultidelegationSupportedByDevice = async (
  walletType: Exclude<WalletType, WalletType.InMemory | WalletType.Script>
): Promise<boolean> => {
  switch (walletType) {
    case WalletType.Ledger: {
      const ledgerInfo = await HardwareLedger.LedgerKeyAgent.getAppVersion(Wallet.KeyManagement.CommunicationType.Web);
      return (
        ledgerInfo.version.major >= LedgerMultidelegationMinAppVersion.MAJOR &&
        ledgerInfo.version.minor >= LedgerMultidelegationMinAppVersion.MINOR &&
        ledgerInfo.version.patch >= LedgerMultidelegationMinAppVersion.PATCH
      );
    }
    case WalletType.Trezor: {
      // To allow checks once the app is refreshed. It won't affect the user flow
      // TODO: Smarter Trezor initialization logic after onboarding revamp LW-9808
      await HardwareTrezor.TrezorKeyAgent.initializeTrezorTransport({
        manifest: Wallet.manifest,
        communicationType: Wallet.KeyManagement.CommunicationType.Web
      });
      const trezorInfo = await HardwareTrezor.TrezorKeyAgent.checkDeviceConnection(
        Wallet.KeyManagement.CommunicationType.Web
      );
      return (
        trezorInfo.major_version >= TrezorMultidelegationFirmwareMinVersion.MAJOR &&
        trezorInfo.minor_version >= TrezorMultidelegationFirmwareMinVersion.MINOR &&
        trezorInfo.patch_version >= TrezorMultidelegationFirmwareMinVersion.PATCH
      );
    }
    default:
      return true;
  }
};
