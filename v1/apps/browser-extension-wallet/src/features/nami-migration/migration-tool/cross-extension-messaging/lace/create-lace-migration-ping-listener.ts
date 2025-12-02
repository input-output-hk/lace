/* eslint-disable consistent-return */
import { MessageSender, NamiLacePingProtocol } from '../shared/types';
import { logger } from '@lace/common';

export const createLaceMigrationPingListener =
  (namiExtensionId: string) =>
  async (message: NamiLacePingProtocol, sender: MessageSender): Promise<void | NamiLacePingProtocol.pong> => {
    logger.debug('[NAMI MIGRATION] createLaceMigrationPingListener', message, sender);
    if (message === NamiLacePingProtocol.ping && sender.id === namiExtensionId) {
      logger.debug('[NAMI MIGRATION] Sending pong message to Nami');
      return NamiLacePingProtocol.pong;
    }
  };
