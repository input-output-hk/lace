/* eslint-disable camelcase */
import { Wallet } from '@lace/cardano';
import { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
import { PostHogProperties } from '@providers/AnalyticsProvider/analyticsTracker';

export const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';
export const isHardwareWalletAvailable = (wallet: Wallet.HardwareWallets): boolean =>
  wallet !== Wallet.KeyManagement.KeyAgentType.Trezor || isTrezorHWSupported();
type HardwareWalletPersonProperties = {
  model: string;
  firmwareVersion?: string;
  cardanoAppVersion?: string;
};

export const getTrezorSpecifications = async (): Promise<HardwareWalletPersonProperties> => {
  const { model, major_version, minor_version, patch_version } =
    await Wallet.KeyManagement.TrezorKeyAgent.checkDeviceConnection(Wallet.KeyManagement.CommunicationType.Web);
  return {
    model: `${Wallet.KeyManagement.KeyAgentType.Trezor} model ${model}`,
    firmwareVersion: `${major_version}.${minor_version}.${patch_version}`
  };
};

export const getLedgerSpecifications = async (
  deviceConnection: LedgerKeyAgent['deviceConnection']
): Promise<HardwareWalletPersonProperties> => {
  const cardanoApp = await deviceConnection.getVersion();
  return {
    model: deviceConnection.transport.deviceModel.id,
    cardanoAppVersion: `${cardanoApp.version.major}.${cardanoApp.version.minor}.${cardanoApp.version.patch}`
  };
};

export const getHWPersonProperties = async (
  connectedDevice: Wallet.HardwareWallets,
  deviceConnection: Wallet.DeviceConnection
): Promise<PostHogProperties> => {
  const HWSpecifications =
    connectedDevice === Wallet.KeyManagement.KeyAgentType.Trezor
      ? await getTrezorSpecifications()
      : await getLedgerSpecifications(deviceConnection as LedgerKeyAgent['deviceConnection']);
  return {
    $set_once: {
      initial_hardware_wallet_model: HWSpecifications.model,
      initial_firmware_version: HWSpecifications?.firmwareVersion,
      initial_cardano_app_version: HWSpecifications?.cardanoAppVersion
    }
  };
};
