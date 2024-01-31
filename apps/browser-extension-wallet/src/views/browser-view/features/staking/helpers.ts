/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import * as HardwareLedger from '../../../../../../../node_modules/@cardano-sdk/hardware-ledger/dist/cjs';
import * as HardwareTrezor from '../../../../../../../node_modules/@cardano-sdk/hardware-trezor/dist/cjs';

export enum LedgerMultidelegationAppVersion {
  MAJOR = 6,
  MINOR = 1,
  PATCH = 2
}

export enum TrezorMultidelegationFirmwareVersion {
  MAJOR = 2,
  MINOR = 6,
  PATCH = 4
}

export const isMultidelegationSupportedByDevice = async (
  keyAgentType: Exclude<Wallet.KeyManagement.KeyAgentType, Wallet.KeyManagement.KeyAgentType.InMemory>
): Promise<boolean> => {
  if (keyAgentType === Wallet.KeyManagement.KeyAgentType.Ledger) {
    const ledgerInfo = await HardwareLedger.LedgerKeyAgent.getAppVersion(Wallet.KeyManagement.CommunicationType.Web);
    return (
      ledgerInfo.version.major >= LedgerMultidelegationAppVersion.MAJOR &&
      ledgerInfo.version.minor >= LedgerMultidelegationAppVersion.MINOR &&
      ledgerInfo.version.patch >= LedgerMultidelegationAppVersion.PATCH
    );
  } else if (keyAgentType === Wallet.KeyManagement.KeyAgentType.Trezor) {
    const trezorInfo = await HardwareTrezor.TrezorKeyAgent.checkDeviceConnection(
      Wallet.KeyManagement.CommunicationType.Web
    );
    return (
      trezorInfo.major_version >= TrezorMultidelegationFirmwareVersion.MAJOR &&
      trezorInfo.minor_version >= TrezorMultidelegationFirmwareVersion.MINOR &&
      trezorInfo.patch_version >= TrezorMultidelegationFirmwareVersion.PATCH
    );
  }
  return true;
};
