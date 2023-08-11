/* eslint-disable camelcase */
import { Wallet } from '@lace/cardano';
import { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';

export const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';
export const isHardwareWalletAvailable = (wallet: Wallet.HardwareWallets): boolean =>
  wallet !== Wallet.KeyManagement.KeyAgentType.Trezor || isTrezorHWSupported();
type HardwareWalletPersonaProperties = {
  model: string;
  firmwareVersion: string;
  cardanoAppVersion?: string;
};

export const getTrezorSpecifications = async (): Promise<HardwareWalletPersonaProperties> => {
  const { model, major_version, minor_version, patch_version } =
    await Wallet.KeyManagement.TrezorKeyAgent.checkDeviceConnection();
  return {
    model: `${Wallet.KeyManagement.KeyAgentType.Trezor} model ${model}`,
    firmwareVersion: `${major_version}.${minor_version}.${patch_version}`
  };
};

export const getLedgerSpecifications = async (
  deviceConnection: LedgerKeyAgent['deviceConnection']
): Promise<HardwareWalletPersonaProperties> => {
  const cardanoApp = await deviceConnection.getVersion();
  const firmware = await LedgerKeyAgent.getAppVersion(Wallet.KeyManagement.CommunicationType.Web, deviceConnection);
  return {
    model: deviceConnection.transport.deviceModel.id,
    firmwareVersion: `${firmware.version.major}.${firmware.version.minor}.${firmware.version.patch}`,
    cardanoAppVersion: `${cardanoApp.version.major}.${cardanoApp.version.minor}.${cardanoApp.version.patch}`
  };
};
