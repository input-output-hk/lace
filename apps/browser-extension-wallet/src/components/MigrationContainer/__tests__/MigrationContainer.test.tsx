/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable import/imports-first */
/* eslint-disable @typescript-eslint/no-explicit-any */

const mockUseWalletManager = {
  unlockWallet: jest.fn(),
  deleteWallet: jest.fn()
};
const mockMigrations = {
  applyMigrations: jest.fn(),
  migrationsRequirePassword: jest.fn().mockResolvedValue(false)
};
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { storage } from 'webextension-polyfill';
import '@testing-library/jest-dom';
import { MigrationContainer } from '../MigrationContainer';
import { APP_MODE_BROWSER, APP_MODE_POPUP } from '@src/utils/constants';
import { ExternalLinkOpenerProvider, ThemeProvider } from '@providers';

jest.mock('../../../hooks', () => ({
  ...jest.requireActual<any>('../../../hooks'),
  useWalletManager: jest.fn().mockReturnValue(mockUseWalletManager)
}));
jest.mock('../../../stores', () => ({
  ...jest.requireActual<any>('../../../stores'),
  useWalletStore: jest.fn().mockReturnValue({})
}));
jest.mock('../../../lib/scripts/migrations', () => ({
  ...jest.requireActual<any>('../../../lib/scripts/migrations'),
  ...mockMigrations
}));
jest.mock('../../../providers', () => ({
  ...jest.requireActual<any>('../../../providers'),
  useBackgroundServiceAPIContext: jest.fn().mockReturnValue({})
}));

const MigrationContainerTest = ({ appMode = APP_MODE_POPUP }) => (
  <ExternalLinkOpenerProvider>
    <ThemeProvider>
      <MigrationContainer appMode={appMode}>
        <div data-testid="mock-child">App</div>
      </MigrationContainer>
    </ThemeProvider>
  </ExternalLinkOpenerProvider>
);

describe('MigrationContainer', () => {
  beforeEach(async () => {
    await storage.local.clear();
    jest.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });
  describe('When migration state on first render is', () => {
    describe('up-to-date', () => {
      beforeEach(async () => {
        await storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } });
      });
      test('renders children', async () => {
        const { queryByTestId } = render(<MigrationContainerTest />);
        await waitFor(() => expect(queryByTestId('mock-child')).toBeInTheDocument());
        await waitFor(() => expect(mockMigrations.applyMigrations).not.toHaveBeenCalled());
      });
    });

    describe('not-loaded', () => {
      beforeEach(async () => {
        await storage.local.set({ MIGRATION_STATE: { state: 'not-loaded' } });
      });
      test('renders MainLoader screen with default message', async () => {
        const { queryByTestId } = render(<MigrationContainerTest />);

        await waitFor(() => expect(queryByTestId('mock-child')).not.toBeInTheDocument());
        await waitFor(() => {
          const mainLoader = queryByTestId('main-loader');
          expect(mainLoader).toBeInTheDocument();
          expect(mainLoader).toHaveTextContent('Loading...');
        });
        await waitFor(() => expect(mockMigrations.applyMigrations).not.toHaveBeenCalled());
      });
    });

    describe('migrating', () => {
      beforeEach(async () => {
        await storage.local.set({ MIGRATION_STATE: { state: 'migrating', from: '1.0.0', to: '2.0.0' } });
      });
      describe('in popup mode', () => {
        test('if password not required, renders MainLoader screen with applying update message and applies migrations', async () => {
          const { queryByTestId } = render(<MigrationContainerTest />);

          await waitFor(() => expect(queryByTestId('mock-child')).not.toBeInTheDocument());
          await waitFor(() => {
            const mainLoader = queryByTestId('main-loader');
            expect(mainLoader).toBeInTheDocument();
            expect(mainLoader).toHaveTextContent('Applying update...');
          });
          await waitFor(() => expect(mockMigrations.migrationsRequirePassword).toHaveBeenCalled());
          await waitFor(() => expect(mockMigrations.applyMigrations).toHaveBeenCalled());
        });
        test('if password required, renders unlock screen and does not applies migrations', async () => {
          mockMigrations.migrationsRequirePassword.mockResolvedValueOnce(true);
          const { queryByTestId } = render(<MigrationContainerTest />);

          await waitFor(() => expect(queryByTestId('mock-child')).not.toBeInTheDocument());
          await waitFor(() => {
            const unlock = queryByTestId('unlock-screen');
            expect(unlock).toBeInTheDocument();
          });
          await waitFor(() => expect(mockMigrations.migrationsRequirePassword).toHaveBeenCalled());
          await waitFor(() => expect(mockMigrations.applyMigrations).not.toHaveBeenCalled());
        });
      });
      describe('in browser mode', () => {
        test('if password not required, renders migration in progress screen and does not apply migrations', async () => {
          const { queryByTestId } = render(<MigrationContainerTest appMode={APP_MODE_BROWSER} />);

          await waitFor(() => expect(queryByTestId('mock-child')).not.toBeInTheDocument());
          await waitFor(() => {
            const inProgress = queryByTestId('migration-in-progress');
            expect(inProgress).toBeInTheDocument();
          });
          await waitFor(() => expect(mockMigrations.applyMigrations).not.toHaveBeenCalled());
        });
        test('if password required, renders wallet locked screen and does not apply migrations', async () => {
          mockMigrations.migrationsRequirePassword.mockResolvedValueOnce(true);
          const { queryByTestId } = render(<MigrationContainerTest appMode={APP_MODE_BROWSER} />);

          await waitFor(() => expect(queryByTestId('mock-child')).not.toBeInTheDocument());
          await waitFor(() => {
            const lock = queryByTestId('lock-screen');
            expect(lock).toBeInTheDocument();
          });
          await waitFor(() => expect(mockMigrations.migrationsRequirePassword).toHaveBeenCalled());
          await waitFor(() => expect(mockMigrations.applyMigrations).not.toHaveBeenCalled());
        });
      });
    });

    describe('error', () => {
      beforeEach(async () => {
        await storage.local.set({ MIGRATION_STATE: { state: 'error', from: '1.0.0', to: '2.0.0' } });
      });

      test('renders failed migration screen', async () => {
        const { queryByTestId } = render(<MigrationContainerTest />);

        await waitFor(() => expect(queryByTestId('mock-child')).not.toBeInTheDocument());
        await waitFor(() => {
          const failed = queryByTestId('reset-data-error');
          expect(failed).toBeInTheDocument();
          expect(failed).toHaveTextContent('Data migration failed!');
        });
        expect(mockMigrations.applyMigrations).not.toHaveBeenCalled();
      });
    });

    describe('not-applied', () => {
      beforeEach(async () => {
        await storage.local.set({ MIGRATION_STATE: { state: 'not-applied', from: '1.0.0', to: '2.0.0' } });
      });
      test('renders MainLoader screen with loading message and tries to apply migrations', async () => {
        const { queryByTestId } = render(<MigrationContainerTest />);

        await waitFor(() => expect(queryByTestId('mock-child')).not.toBeInTheDocument());
        await waitFor(() => {
          const mainLoader = queryByTestId('main-loader');
          expect(mainLoader).toBeInTheDocument();
          expect(mainLoader).toHaveTextContent('Loading...');
        });
        await waitFor(() => expect(mockMigrations.migrationsRequirePassword).toHaveBeenCalled());
        await waitFor(() => expect(mockMigrations.applyMigrations).toHaveBeenCalled());
      });
    });
  });
});
