/* eslint-disable no-console */
import { MessageSender, NamiMessages } from '../shared/types';

export const createLaceMigrationOpenListener =
  (namiExtensionId: string, laceExtensionId: string, createTab: ({ url }: { url: string }) => void) =>
  async (message: NamiMessages, sender: MessageSender): Promise<void> => {
    console.log('[NAMI MIGRATION] createLaceMigrationOpenListener', message, sender);
    if (message === NamiMessages.open && sender.id === namiExtensionId) {
      createTab({ url: `chrome-extension://${laceExtensionId}/app.html` });
    }
  };
