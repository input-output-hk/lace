/* eslint-disable consistent-return */
import { MessageSender, NamiLacePingProtocol } from '../shared/types';
import { logger } from '@lace/common';

export const createLaceMigrationPingListener =
  (namiExtensionId: string) =>
  async (message: NamiLacePingProtocol, sender: MessageSender): Promise<void | NamiLacePingProtocol.pong> => {
    logger.info('[NAMI MIGRATION] createLaceMigrationPingListener', message, sender);
    if (message === NamiLacePingProtocol.ping && sender.id === namiExtensionId) {
      logger.info('[NAMI MIGRATION] Sending pong message to Nami');
      return NamiLacePingProtocol.pong;
    }
  };
