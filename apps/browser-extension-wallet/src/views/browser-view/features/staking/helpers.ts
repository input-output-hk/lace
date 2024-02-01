/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import * as HardwareLedger from '../../../../../../../node_modules/@cardano-sdk/hardware-ledger/dist/cjs';
import * as HardwareTrezor from '../../../../../../../node_modules/@cardano-sdk/hardware-trezor/dist/cjs';

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
  keyAgentType: Exclude<Wallet.KeyManagement.KeyAgentType, Wallet.KeyManagement.KeyAgentType.InMemory>
): Promise<boolean> => {
  switch (keyAgentType) {
    case Wallet.KeyManagement.KeyAgentType.Ledger: {
      const ledgerInfo = await HardwareLedger.LedgerKeyAgent.getAppVersion(Wallet.KeyManagement.CommunicationType.Web);
      return (
        ledgerInfo.version.major >= LedgerMultidelegationMinAppVersion.MAJOR &&
        ledgerInfo.version.minor >= LedgerMultidelegationMinAppVersion.MINOR &&
        ledgerInfo.version.patch >= LedgerMultidelegationMinAppVersion.PATCH
      );
    }
    case Wallet.KeyManagement.KeyAgentType.Trezor: {
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
