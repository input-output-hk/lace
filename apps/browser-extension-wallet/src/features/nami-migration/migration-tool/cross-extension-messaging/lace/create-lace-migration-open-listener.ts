import { closeAllLaceOrNamiTabs } from '@lib/scripts/background/util';
import { MessageSender, NamiMessages } from '../shared/types';
import { logger } from '@lace/common';

export const createLaceMigrationOpenListener =
  (namiExtensionId: string, laceExtensionId: string, createTab: ({ url }: { url: string }) => void) =>
  async (message: NamiMessages, sender: MessageSender): Promise<void> => {
    logger.debug('[NAMI MIGRATION] createLaceMigrationOpenListener', message, sender);
    if (message === NamiMessages.open && sender.id === namiExtensionId) {
      // First close all open lace tabs
      await closeAllLaceOrNamiTabs();
      createTab({ url: `chrome-extension://${laceExtensionId}/app.html` });
    }
  };
