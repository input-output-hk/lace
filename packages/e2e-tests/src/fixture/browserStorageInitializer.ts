import { WalletConfig } from '../support/walletConfiguration';
import { setBackgroundStorage, setMigrationState } from '../utils/browserStorage';
import { Logger } from '../support/logger';

export const initializeBrowserStorage = async (wallet: WalletConfig): Promise<void> => {
  try {
    await setBackgroundStorage({ mnemonic: wallet?.backgroundStorage?.mnemonic });
  } catch (error) {
    Logger.log(`Failed to set mnemonic in browser storage due to: ${error}`);
  }

  try {
    await setBackgroundStorage({ keyAgentsByChain: JSON.parse(String(wallet?.backgroundStorage?.keyAgentsByChain)) });
  } catch (error) {
    Logger.log(`Failed to set keyAgentsByChain in browser storage due to: ${error}`);
  }

  try {
    await setBackgroundStorage({
      usePersistentUserId: JSON.parse(String(wallet?.backgroundStorage?.usePersistentUserId))
    });
  } catch (error) {
    Logger.log(`Failed to set usePersistentUserId in browser storage due to: ${error}`);
  }

  await setMigrationState();
};
