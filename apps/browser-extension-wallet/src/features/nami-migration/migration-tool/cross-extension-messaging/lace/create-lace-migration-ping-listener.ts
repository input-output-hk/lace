/* eslint-disable consistent-return */
/* eslint-disable no-console */
import { MessageSender, NamiLacePingProtocol } from '../shared/types';

export const createLaceMigrationPingListener =
  (namiExtensionId: string) =>
  async (message: NamiLacePingProtocol, sender: MessageSender): Promise<void | NamiLacePingProtocol.pong> => {
    console.log('[NAMI MIGRATION] createLaceMigrationPingListener', message, sender);
    if (message === NamiLacePingProtocol.ping && sender.id === namiExtensionId) {
      console.log('[NAMI MIGRATION] Sending pong message to Nami');
      return NamiLacePingProtocol.pong;
    }
  };
