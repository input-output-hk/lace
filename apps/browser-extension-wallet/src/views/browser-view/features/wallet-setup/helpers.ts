/* eslint-disable camelcase */
import { Wallet } from '@lace/cardano';
import * as HardwareLedger from '../../../../../../../node_modules/@cardano-sdk/hardware-ledger/dist/cjs';
import * as HardwareTrezor from '../../../../../../../node_modules/@cardano-sdk/hardware-trezor/dist/cjs';
import { PostHogProperties } from '@providers/AnalyticsProvider/analyticsTracker';
import { WalletType } from '@cardano-sdk/web-extension';

export const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';
export const isHardwareWalletAvailable = (wallet: Wallet.HardwareWallets): boolean =>
  wallet !== WalletType.Trezor || isTrezorHWSupported();
type HardwareWalletPersonProperties = {
  model: string;
  firmwareVersion?: string;
  cardanoAppVersion?: string;
};

export const getTrezorSpecifications = async (): Promise<HardwareWalletPersonProperties> => {
  const { model, major_version, minor_version, patch_version } =
    await HardwareTrezor.TrezorKeyAgent.checkDeviceConnection(Wallet.KeyManagement.CommunicationType.Web);
  return {
    model: `${WalletType.Trezor} model ${model}`,
    firmwareVersion: `${major_version}.${minor_version}.${patch_version}`
  };
};

export const getLedgerSpecifications = async (
  deviceConnection: HardwareLedger.LedgerKeyAgent['deviceConnection']
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
    connectedDevice === WalletType.Trezor
      ? await getTrezorSpecifications()
      : await getLedgerSpecifications(deviceConnection as HardwareLedger.LedgerKeyAgent['deviceConnection']);
  return {
    $set_once: {
      initial_hardware_wallet_model: HWSpecifications.model,
      initial_firmware_version: HWSpecifications?.firmwareVersion,
      initial_cardano_app_version: HWSpecifications?.cardanoAppVersion
    }
  };
};

export const copyRecoveryPhrase = async (mnemonic: string[], joiner = ' ') => {
  const copiedPhrase = mnemonic.join(joiner);
  await navigator.clipboard.writeText(copiedPhrase);
};

export const pasteRecoveryPhrase = async (splitter = ' ') => {
  const text = await navigator.clipboard.readText();
  return text.split(splitter);
};
