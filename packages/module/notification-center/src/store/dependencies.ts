import type { LaceInit } from '@lace-contract/module';

// TODO this will be defined once the API will be available
export type NotificationsCenterDependencies = {
  notificationCenter: { unused: () => Promise<string> };
};

export const initializeDependencies: LaceInit<
  NotificationsCenterDependencies
> = async (_, { logger }) => {
  logger.debug('Notifications Center initializeDependencies');

  // Init the notifications center SDK

  return { notificationCenter: { unused: async () => 'unused' } };
};
