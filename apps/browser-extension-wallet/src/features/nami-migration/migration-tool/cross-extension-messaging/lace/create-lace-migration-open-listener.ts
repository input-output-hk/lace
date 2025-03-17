import { closeAllLaceOrNamiTabs } from '@lib/scripts/background/util';
import { MessageSender, NamiMessages } from '../shared/types';
import { logger } from '@lace/common';

export const createLaceMigrationOpenListener =
  (namiExtensionId: string, laceExtensionId: string, createTab: ({ url }: { url: string }) => void) =>
  async (message: NamiMessages, sender: MessageSender): Promise<void> => {
    logger.debug('[NAMI MIGRATION] createLaceMigrationOpenListener', message, sender);
    if (message === NamiMessages.open && sender.id === namiExtensionId) {
      // First close all open lace tabs
      try {
        await closeAllLaceOrNamiTabs();
      } catch (error) {
        logger.error('[NAMI MIGRATION] createLaceMigrationOpenListener: failed to close all windows', error);
      }
      // Migrations will not run in Firefox, so no need to update this
      createTab({ url: `chrome-extension://${laceExtensionId}/app.html` });
    }
  };
