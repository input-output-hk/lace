import { WalletConfig } from '../support/walletConfiguration';
import { setBackgroundStorage, setMigrationState } from '../utils/browserStorage';
import { Logger } from '../support/logger';
import extensionUtils from '../utils/utils';

export const initializeBrowserStorage = async (wallet: WalletConfig): Promise<void> => {
  if (extensionUtils.isElectron()) {
    return;
  }

  try {
    await setBackgroundStorage({ mnemonic: wallet.backgroundStorage.mnemonic });
  } catch (error) {
    Logger.log(`Failed to set mnemonic in browser storage due to: ${error}`);
  }

  try {
    await setBackgroundStorage({ keyAgentsByChain: JSON.parse(wallet.backgroundStorage.keyAgentsByChain) });
  } catch (error) {
    Logger.log(`Failed to set keyAgentsByChain in browser storage due to: ${error}`);
  }

  await setMigrationState();
};
