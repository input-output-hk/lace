export const REDUX_PERSIST_PREFIX = 'redux:persist:';

export const MIGRATE_V1_PERSIST_KEY = `${REDUX_PERSIST_PREFIX}migrateV1`;

export const LMP_WALLETS_BACKUP_KEY = 'migrateV1:backup:wallets';

/**
 * The set of v2 redux-persist keys that preparePreloadedState rebuilds and
 * that restartV1Migration must wipe to avoid rehydration overwriting the
 * fresh preloaded state. The appLock key is wiped so the persisted sentinel
 * does not survive a wizard restart and force the lock state machine into
 * Locked instead of AwaitingSetup on rehydration.
 */
export const V2_REBUILT_PERSIST_KEYS = [
  `${REDUX_PERSIST_PREFIX}analytics`,
  `${REDUX_PERSIST_PREFIX}authorizedDapps`,
  `${REDUX_PERSIST_PREFIX}wallets`,
  `${REDUX_PERSIST_PREFIX}networkType`,
  `${REDUX_PERSIST_PREFIX}tokenFolders`,
  `${REDUX_PERSIST_PREFIX}addressBook`,
  `${REDUX_PERSIST_PREFIX}appLock`,
] as const;
