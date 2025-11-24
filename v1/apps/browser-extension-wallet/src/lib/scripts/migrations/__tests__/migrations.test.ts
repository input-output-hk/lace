/* eslint-disable camelcase */
/* eslint-disable no-magic-numbers */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/no-useless-undefined */
import { MigrationState } from '@lib/scripts/types';
import { Manifest, runtime, storage } from 'webextension-polyfill';
import { applyMigrations, checkMigrations, Migration, migrationsRequirePassword } from '../migrations';

const windowReload = jest.fn();
const mockPersistanceFunctions = (implementations?: {
  prepareImpl: () => any;
  assertImpl: () => any;
  persistImpl: () => any;
  rollbackImpl: () => any;
}) => ({
  prepare: jest.fn(implementations?.prepareImpl),
  assert: jest.fn(implementations?.assertImpl),
  persist: jest.fn(implementations?.persistImpl),
  rollback: jest.fn(implementations?.rollbackImpl)
});
const mockMigration = (version: string) => ({
  version,
  upgradeReturn: mockPersistanceFunctions(),
  downgradeReturn: mockPersistanceFunctions()
});

const buildMigrations = (): {
  migrations: Migration[];
  getMigrationMocks: (version: string) => ReturnType<typeof mockMigration>;
} => {
  const migrations: Migration[] = [];
  const migrationMocks: ReturnType<typeof mockMigration>[] = [];

  ['1.0.0', '2.0.0', '3.0.0', '3.1.0', '3.1.5'].forEach((version) => {
    const mocked = mockMigration(version);

    migrations.push({
      version,
      upgrade: jest.fn(() => mocked.upgradeReturn),
      downgrade: jest.fn(() => mocked.downgradeReturn)
    });
    migrationMocks.push(mocked);
  });
  return { migrations, getMigrationMocks: (version) => migrationMocks.find((mock) => mock.version === version) };
};

describe('migrations', () => {
  let mockMigrations: Migration[] = [];
  let getMigrationMocks: (version: string) => ReturnType<typeof mockMigration>;
  let windowSpy: jest.SpyInstance;

  beforeEach(() => {
    const mocked = buildMigrations();
    mockMigrations = mocked.migrations;
    getMigrationMocks = mocked.getMigrationMocks;
    windowSpy = jest
      .spyOn(window, 'window', 'get')
      .mockImplementation(
        () => ({ location: { reload: windowReload } as unknown as Location } as unknown as Window & typeof globalThis)
      );
  });

  afterEach(async () => {
    windowSpy.mockRestore();
    await storage.local.clear();
  });

  describe('applyMigrations', () => {
    describe('do not apply', () => {
      test.each([
        ['up-to-date', undefined, undefined],
        ['not-loaded', undefined, undefined],
        ['error', '0.0.1', '3.1.5']
      ])('when migrationState is %s', async (state, from, to) => {
        await applyMigrations({ state: state as any, from, to }, undefined, mockMigrations);
        mockMigrations.forEach((migration) => {
          expect(migration.upgrade).not.toHaveBeenCalled();
          expect(migration.downgrade).not.toHaveBeenCalled();
        });
      });

      test('when there are no migrations between from and to', async () => {
        await applyMigrations({ state: 'not-applied', from: '1.4.0', to: '1.6.0' }, undefined, mockMigrations);
        mockMigrations.forEach((migration) => {
          expect(migration.upgrade).not.toHaveBeenCalled();
          expect(migration.downgrade).not.toHaveBeenCalled();
        });
      });
    });

    describe('apply', () => {
      test('all available upgrades when migrating from an older version to a newer one', async () => {
        await applyMigrations({ state: 'not-applied', from: '1.0.0', to: '3.1.0' }, 'password', mockMigrations);
        const shouldApply = mockMigrations.filter((migration) =>
          ['2.0.0', '3.0.0', '3.1.0'].includes(migration.version)
        );
        const shouldNotApply = mockMigrations.filter(
          (migration) => !['2.0.0', '3.0.0', '3.1.0'].includes(migration.version)
        );
        shouldApply.forEach((migration) => {
          const { assert, persist, prepare, rollback } = getMigrationMocks(migration.version).upgradeReturn;
          expect(migration.upgrade).toHaveBeenCalledWith('password');
          expect(prepare).toHaveBeenCalledTimes(1);
          expect(assert).toHaveBeenCalledTimes(1);
          expect(assert.mock.invocationCallOrder[0]).toBeGreaterThan(prepare.mock.invocationCallOrder[0]);
          expect(persist).toHaveBeenCalledTimes(1);
          expect(persist.mock.invocationCallOrder[0]).toBeGreaterThan(assert.mock.invocationCallOrder[0]);
          expect(rollback).not.toHaveBeenCalled();
          expect(migration.downgrade).not.toHaveBeenCalled();
        });
        shouldNotApply.forEach((migration) => {
          expect(migration.upgrade).not.toHaveBeenCalled();
          expect(migration.downgrade).not.toHaveBeenCalled();
        });
      });
      test('all available upgrades in ascending order according to version number', async () => {
        const unsortedMigrations = [
          { version: '2.0.0', upgrade: jest.fn(() => mockPersistanceFunctions()) },
          { version: '3.0.0', upgrade: jest.fn(() => mockPersistanceFunctions()) },
          { version: '1.0.0', upgrade: jest.fn(() => mockPersistanceFunctions()) }
        ];
        await applyMigrations({ state: 'not-applied', from: '0.0.9', to: '3.0.0' }, undefined, unsortedMigrations);
        expect(unsortedMigrations[2].upgrade).toHaveBeenCalled();
        expect(unsortedMigrations[0].upgrade).toHaveBeenCalled();
        expect(unsortedMigrations[0].upgrade.mock.invocationCallOrder[0]).toBeGreaterThan(
          unsortedMigrations[2].upgrade.mock.invocationCallOrder[0]
        );
        expect(unsortedMigrations[1].upgrade).toHaveBeenCalled();
        expect(unsortedMigrations[1].upgrade.mock.invocationCallOrder[0]).toBeGreaterThan(
          unsortedMigrations[0].upgrade.mock.invocationCallOrder[0]
        );
      });
      test.todo('implement downgrades and test');

      test('and skip migrations that should be skipped', async () => {
        const withSkipMigrations = [...mockMigrations];
        withSkipMigrations[2].shouldSkip = jest.fn().mockResolvedValue(true);
        // eslint-disable-next-line no-console
        console.log(withSkipMigrations[2]);
        await applyMigrations({ state: 'not-applied', from: '0.5.0', to: '3.1.5' }, undefined, withSkipMigrations);
        const shouldApply = mockMigrations.filter((_, index) => index !== 2);
        const shouldSkip = mockMigrations.filter((_, index) => index === 2);
        shouldApply.forEach((migration) => {
          expect(migration.upgrade).toHaveReturnedTimes(1);
        });
        shouldSkip.forEach((migration) => {
          expect(migration.upgrade).not.toHaveBeenCalled();
        });
      });

      describe('rollback and retry', () => {
        test('when an error occurs on prepare', async () => {
          const mockUpgrade = {
            prepare: jest
              .fn()
              .mockRejectedValueOnce(new Error('some error'))
              .mockImplementationOnce(() => Promise.resolve(undefined)),
            assert: jest.fn(),
            persist: jest.fn(),
            rollback: jest.fn()
          };
          const failingMigration: Migration = {
            version: '10.0.0',
            upgrade: () => mockUpgrade
          };

          await applyMigrations({ state: 'not-applied', from: '9.9.9', to: '10.0.0' }, undefined, [failingMigration]);
          expect(mockUpgrade.prepare).toHaveBeenCalledTimes(2);
          expect(mockUpgrade.assert).toHaveBeenCalledTimes(1);
          expect(mockUpgrade.persist).toHaveBeenCalledTimes(1);
          expect(mockUpgrade.rollback).toHaveBeenCalledTimes(1);
        });

        test('when an error occurs on assert', async () => {
          const mockUpgrade = {
            prepare: jest.fn(),
            assert: jest
              .fn()
              .mockRejectedValueOnce(new Error('some error'))
              .mockImplementationOnce(() => Promise.resolve(undefined)),
            persist: jest.fn(),
            rollback: jest.fn()
          };
          const failingMigration: Migration = {
            version: '10.0.0',
            upgrade: () => mockUpgrade
          };

          await applyMigrations({ state: 'not-applied', from: '9.9.9', to: '10.0.0' }, undefined, [failingMigration]);
          expect(mockUpgrade.prepare).toHaveBeenCalledTimes(2);
          expect(mockUpgrade.assert).toHaveBeenCalledTimes(2);
          expect(mockUpgrade.persist).toHaveBeenCalledTimes(1);
          expect(mockUpgrade.rollback).toHaveBeenCalledTimes(1);
        });

        test('when an error occurs on persist', async () => {
          const mockUpgrade = {
            prepare: jest.fn(),
            assert: jest.fn(),
            persist: jest
              .fn()
              .mockRejectedValueOnce(new Error('some error'))
              .mockImplementationOnce(() => Promise.resolve(undefined)),
            rollback: jest.fn()
          };
          const failingMigration: Migration = {
            version: '10.0.0',
            upgrade: () => mockUpgrade
          };

          await applyMigrations({ state: 'not-applied', from: '9.9.9', to: '10.0.0' }, undefined, [failingMigration]);
          expect(mockUpgrade.prepare).toHaveBeenCalledTimes(2);
          expect(mockUpgrade.assert).toHaveBeenCalledTimes(2);
          expect(mockUpgrade.persist).toHaveBeenCalledTimes(2);
          expect(mockUpgrade.rollback).toHaveBeenCalledTimes(1);
        });

        test('then set error state and do not throw when reached max attempts', async () => {
          const mockUpgrade = {
            prepare: jest.fn().mockRejectedValue(new Error('some error')),
            assert: jest.fn(),
            persist: jest.fn(),
            rollback: jest.fn()
          };
          const failingMigration: Migration = {
            version: '10.0.0',
            upgrade: () => mockUpgrade
          };

          await expect(
            applyMigrations({ state: 'not-applied', from: '9.9.9', to: '10.0.0' }, undefined, [failingMigration])
          ).resolves.toBeUndefined();
          expect(mockUpgrade.prepare).toHaveBeenCalledTimes(5);
          expect(mockUpgrade.assert).toHaveBeenCalledTimes(0);
          expect(mockUpgrade.persist).toHaveBeenCalledTimes(0);
          expect(mockUpgrade.rollback).toHaveBeenCalledTimes(5);
          expect(storage.local.set).toHaveBeenCalledWith({
            MIGRATION_STATE: { state: 'error', from: '9.9.9', to: '10.0.0' }
          });
        });
      });

      describe('migration state changes', () => {
        const initialState: MigrationState = { state: 'not-applied', from: '1.0.0', to: '3.0.0' };
        beforeEach(async () => {
          await storage.local.set(initialState);
          (storage.local.set as jest.Mock).mockClear(); // clear mock so initial set is not count
        });

        afterEach(async () => {
          await storage.local.clear();
        });

        describe('set to "migrating" state', () => {
          test('when a migration starts', async () => {
            await applyMigrations(initialState, undefined, mockMigrations);
            expect(storage.local.set).toHaveBeenNthCalledWith(1, {
              MIGRATION_STATE: { ...initialState, state: 'migrating' }
            });
          });

          test('and update the "from" field when a migration is applied successfully', async () => {
            await applyMigrations(initialState, undefined, mockMigrations);
            expect(storage.local.set).toHaveBeenNthCalledWith(2, {
              MIGRATION_STATE: { ...initialState, from: '2.0.0', state: 'migrating' }
            });
            expect(storage.local.set).toHaveBeenNthCalledWith(3, {
              MIGRATION_STATE: { ...initialState, from: '3.0.0', state: 'migrating' }
            });
          });
        });

        describe('set to "up-to-date" state', () => {
          test('when all migrations were applied successfully', async () => {
            await applyMigrations(initialState, undefined, mockMigrations);
            expect(storage.local.set).toHaveBeenLastCalledWith({
              MIGRATION_STATE: { state: 'up-to-date' }
            });
          });
        });

        describe('set to "error" state', () => {
          test('when all attempts to migrate failed', async () => {
            const mockUpgrade = {
              prepare: jest.fn().mockRejectedValue(new Error('some error')),
              assert: jest.fn(),
              persist: jest.fn(),
              rollback: jest.fn()
            };
            const failingMigration: Migration = {
              version: '2.0.0',
              upgrade: () => mockUpgrade
            };

            await applyMigrations(initialState, undefined, [failingMigration]);
            expect(storage.local.set).toHaveBeenLastCalledWith({
              MIGRATION_STATE: { state: 'error', from: '1.0.0', to: '3.0.0' }
            });
          });
        });
      });
    });
  });
  describe('migrationsRequirePassword', () => {
    const noPasswordMigration: Migration = {
      version: '4.0.0',
      upgrade: jest.fn(),
      requiresPassword: jest.fn(() => false)
    };
    const withPasswordMigration: Migration = {
      version: '5.0.0',
      upgrade: jest.fn(),
      requiresPassword: jest.fn(() => true)
    };
    describe('is false', () => {
      test.each([
        ['up-to-date', undefined, undefined],
        ['not-loaded', undefined, undefined],
        ['error', '0.0.1', '3.1.5']
      ])('when migrationState is %s', async (state, from, to) => {
        await expect(
          migrationsRequirePassword({ state: state as any, from, to }, [...mockMigrations, noPasswordMigration])
        ).resolves.toBe(false);
        expect(noPasswordMigration.requiresPassword).not.toHaveBeenCalled();
      });

      test('when there are no migrations between from and to', async () => {
        await expect(
          migrationsRequirePassword({ state: 'not-applied', from: '1.4.0', to: '1.6.0' }, [
            ...mockMigrations,
            noPasswordMigration
          ])
        ).resolves.toBe(false);
        expect(noPasswordMigration.requiresPassword).not.toHaveBeenCalled();
      });

      test('when requiresPassword returns false or is not defined for all migrations', async () => {
        await expect(
          migrationsRequirePassword({ state: 'not-applied', from: '0.0.1', to: '4.0.0' }, [
            ...mockMigrations,
            noPasswordMigration
          ])
        ).resolves.toBe(false);
        expect(noPasswordMigration.requiresPassword).toHaveBeenCalled();
      });
    });
    describe('is true', () => {
      test('when some migration requires the password', async () => {
        await expect(
          migrationsRequirePassword({ state: 'not-applied', from: '0.0.1', to: '5.0.0' }, [
            ...mockMigrations,
            noPasswordMigration,
            withPasswordMigration
          ])
        ).resolves.toBe(true);
        expect(noPasswordMigration.requiresPassword).toHaveReturnedWith(false);
        expect(withPasswordMigration.requiresPassword).toHaveReturnedWith(true);
      });
    });
  });
  describe('checkMigrations', () => {
    beforeAll(() => {
      runtime.getManifest = jest.fn(() => ({ version: '3.0.0' } as Manifest.ManifestBase));
    });
    afterAll(() => {
      delete runtime.getManifest;
    });
    describe('set migration state to "up-to-date"', () => {
      // TODO: change when downgrades implemented [LW-5595]
      test('when is a downgrade', async () => {
        await checkMigrations('4.0.0', mockMigrations);
        expect(storage.local.set).toHaveBeenCalledWith({ MIGRATION_STATE: { state: 'up-to-date' } });
      });

      test('when no upgrades found between previous and current versions', async () => {
        await checkMigrations('2.9.9', mockMigrations);
        expect(storage.local.set).toHaveBeenCalledWith({ MIGRATION_STATE: { state: 'up-to-date' } });
      });
    });

    describe('set migration state to "not-applied"', () => {
      // TODO: add downgrade case when implemented [LW-5595]
      test('when at least one upgrade was found between previous and current versions', async () => {
        await checkMigrations('1.0.0', mockMigrations);
        expect(storage.local.set).toHaveBeenCalledWith({
          MIGRATION_STATE: { state: 'not-applied', from: '1.0.0', to: '3.0.0' }
        });
      });
    });
  });
});
