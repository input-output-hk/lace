import { DockerManager } from '../support/DockerManager';

import type { Feature } from '@cucumber/messages';
import { Logger } from '../support/logger';

export const beforeFeatureHook = async (_uri: string, feature: Feature): Promise<void> => {
  Logger.log('running before feature hook');
  const tags = feature.tags.map((tag) => tag.name);

  if (tags.includes('@Trezor') && !DockerManager.getContainer() && process.env.PRE_STARTED_TREZOR_SERVICES !== 'true') {
    await DockerManager.startComposeFile();
  }
};
