import React, { useCallback, useEffect, useState } from 'react';
import { storage, Storage } from 'webextension-polyfill';
import isNil from 'lodash/isNil';
import { applyMigrations, migrationsRequirePassword } from '@lib/scripts/migrations';
import { MigrationState } from '@lib/scripts/types';
import { UnlockWallet } from '@src/features/unlock-wallet';
import { useWalletManager } from '@hooks';
import { AppMode, APP_MODE_POPUP } from '@src/utils/constants';
import { Lock } from '@src/views/browser-view/components/Lock';
import { MainLoader } from '@components/MainLoader';
import { FailedMigration } from './FailedMigration';
import { MigrationInProgress } from './MigrationInProgress';
import { useSecrets } from '@lace/core';
import type { OnPasswordChange, PasswordObj } from '@lace/core';

export interface MigrationContainerProps {
  children: React.ReactNode;
  appMode: AppMode;
}

interface RenderState {
  isMigrating: boolean;
  locked: boolean;
  didMigrationFail: boolean;
}

const INITIAL_RENDER_STATE = { locked: false, didMigrationFail: false, isMigrating: true };

export const MigrationContainer = ({ children, appMode }: MigrationContainerProps): React.ReactElement => {
  const { unlockWallet } = useWalletManager();

  const [isLoadingFirstTime, setIsLoadingFirstTime] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState | undefined>();
  const [renderState, setRenderState] = useState<RenderState>(INITIAL_RENDER_STATE);

  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const { password, setPassword, clearSecrets } = useSecrets();
  const [isValidPassword, setIsValidPassword] = useState(true);

  const migrate = useCallback(
    async (spendingPassphrase: Partial<PasswordObj>) => {
      setRenderState(INITIAL_RENDER_STATE);
      if (appMode === APP_MODE_POPUP) await applyMigrations(migrationState, spendingPassphrase.value);
    },
    [migrationState, appMode]
  );

  const handlePasswordChange = useCallback<OnPasswordChange>(
    (target) => {
      if (!isValidPassword) {
        setIsValidPassword(true);
      }
      setPassword(target);
    },
    [isValidPassword, setPassword]
  );

  const lockAndMigrate = useCallback(
    async (spendingPassphrase) => {
      const shouldLock = await migrationsRequirePassword(migrationState);
      if (shouldLock) {
        setRenderState({ didMigrationFail: false, locked: true, isMigrating: true });
        return;
      }
      await migrate(spendingPassphrase);
    },
    [migrate, migrationState]
  );

  const onUnlock = useCallback(
    async (spendingPassphrase: Partial<PasswordObj>): Promise<void> => {
      setIsVerifyingPassword(true);
      try {
        await unlockWallet();
        setIsValidPassword(true);
        await migrate(spendingPassphrase);
        clearSecrets();
      } catch {
        setIsValidPassword(false);
      } finally {
        clearSecrets();
      }
      setIsVerifyingPassword(false);
    },
    [unlockWallet, migrate, clearSecrets]
  );

  useEffect(() => {
    // Load initial migrationState value
    storage.local
      .get('MIGRATION_STATE')
      .then((value) => {
        setIsLoadingFirstTime(true);
        setMigrationState(value.MIGRATION_STATE as MigrationState);
      })
      .catch((error) => console.error('Error fetching initial migration state:', error));

    // Observe changes to MIGRATION_STATE in storage
    const observeMigrationState = async (changes: Record<string, Storage.StorageChange>) => {
      if (changes.MIGRATION_STATE && changes.MIGRATION_STATE.newValue !== changes.MIGRATION_STATE.oldValue) {
        setIsLoadingFirstTime(false);
        if (isNil(changes.MIGRATION_STATE.newValue)) {
          // Don't allow changing to undefined
          await storage.local.set({ MIGRATION_STATE: changes.MIGRATION_STATE.oldValue as MigrationState });
          setMigrationState(changes.MIGRATION_STATE.oldValue);
          return;
        }
        setMigrationState(changes.MIGRATION_STATE.newValue as MigrationState);
      }
    };
    if (!storage.onChanged.hasListener(observeMigrationState)) storage.onChanged.addListener(observeMigrationState);

    return () => {
      storage.onChanged.removeListener(observeMigrationState);
    };
  }, []);

  useEffect(() => {
    // TODO: refactor with `useReducer` [LW-6494]
    (async () => {
      if (!migrationState) return;
      switch (migrationState.state) {
        case 'not-applied': {
          await lockAndMigrate(password);
          break;
        }
        case 'not-loaded': {
          setRenderState(INITIAL_RENDER_STATE);
          break;
        }
        case 'migrating': {
          if (isLoadingFirstTime) {
            // This means an update was interrupted while migrating last time the app was opened
            await lockAndMigrate(password);
            break;
          }
          setRenderState(INITIAL_RENDER_STATE);
          break;
        }
        case 'error': {
          setRenderState({ didMigrationFail: true, locked: false, isMigrating: false });
          break;
        }
        case 'up-to-date': {
          setRenderState({ didMigrationFail: false, locked: false, isMigrating: false });
        }
      }
    })();
  }, [migrationState, lockAndMigrate, isLoadingFirstTime]);

  if (renderState.didMigrationFail) return <FailedMigration appMode={appMode} />;

  if (renderState.locked) {
    return appMode === APP_MODE_POPUP ? (
      <UnlockWallet
        isLoading={isVerifyingPassword}
        onUnlock={() => onUnlock(password)}
        passwordInput={{ handleChange: handlePasswordChange, invalidPass: !isValidPassword }}
        unlockButtonDisabled={!password.value}
        // TODO: show forgot password here too. Use same logic as in ResetDataError on click
        showForgotPassword={false}
      />
    ) : (
      <Lock />
    );
  }

  if (renderState.isMigrating) {
    return migrationState && migrationState.state === 'migrating' ? (
      <MigrationInProgress appMode={appMode} />
    ) : (
      <MainLoader />
    );
  }

  return <>{children}</>;
};
