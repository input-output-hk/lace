# @lace-contract/sync

Per-account synchronization tracking for blockchain operations.

## Overview

This contract provides fine-grained sync status tracking at the account level, replacing the previous per-blockchain approach. It supports:

- **Sync operations** with state machine (Pending → InProgress → Completed/Failed)
- **Determinate operations** with progress tracking (e.g., token fetching)
- **Indeterminate operations** without progress (e.g., address discovery)
- **Coordinated sync rounds** for operations that must complete together

## Quick Start

### 1. Add Dependency

```json
// package.json
{
  "dependencies": {
    "@lace-contract/sync": "*"
  }
}
```

### 2. Implement Contract

```typescript
// src/index.ts
import { syncStoreContract } from '@lace-contract/sync';

const implementsContracts = combineContracts([
  syncStoreContract,
  // ... other contracts
]);
```

### 3. Track Sync Operations

**For determinate operations (with progress)**:

```typescript
// Start operation
actions.sync.addSyncOperation({
  accountId,
  operation: {
    operationId: `${accountId}-tokens`,
    status: 'InProgress',
    type: 'Determinate',
    progress: Percent(0),
    description: 'sync.operation.tokens',
    startedAt: Timestamp(Date.now()),
  },
});

// Update progress
actions.sync.updateSyncProgress({
  accountId,
  operationId,
  progress: Percent(0.5), // 50%
});

// Complete
actions.sync.completeSyncOperation({ accountId, operationId });
```

**For indeterminate operations (no progress)**:

```typescript
actions.sync.addSyncOperation({
  accountId,
  operation: {
    operationId: `${accountId}-address-discovery`,
    status: 'InProgress',
    type: 'Indeterminate', // No progress field
    description: 'sync.operation.address-discovery',
    startedAt: Timestamp(Date.now()),
  },
});
```

### 4. Access Sync Status

```typescript
// In side effects
const { selectSyncStatusByAccount$ } = stateObservables.sync;

selectSyncStatusByAccount$.pipe(
  withLatestFrom(...),
  map(([syncStatusByAccount, ...]) => {
    // Extract specific account's sync status
    const accountStatus = syncStatusByAccount[accountId];
    // ...
  })
);

// In React components
const isAccountSyncing = useLaceSelector(
  'sync.selectIsAccountSyncing',
  accountId
);
const globalStatus = useLaceSelector('sync.selectGlobalSyncStatus');
```

## Integration Patterns

### Pattern 1: Sync Coordinator (Cardano)

For operations that must complete together, use a coordinator:

```typescript
// Create all operations upfront
const operations = [
  { operationId: `${roundId}-address-discovery`, ... },
  { operationId: `${roundId}-tokens`, ... },
];

// Add all at once
operations.forEach(op =>
  dispatch(actions.sync.addSyncOperation({ accountId, operation: op }))
);

// Operations complete independently, round auto-completes when all done
```

**Full example**: `packages/contract/cardano-context/src/store/side-effects/coordinate-sync.ts`

### Pattern 2: Operation Responder

Create side effects that respond to pending operations:

```typescript
export const myOperationSync: SideEffect = ({ sync: { addSyncOperation$ } }) =>
  // ...
  addSyncOperation$.pipe(
    filter(
      ({ payload }) =>
        payload.operation.operationId.endsWith('-my-operation') &&
        payload.operation.status === 'Pending',
    ),
    switchMap(({ payload: { accountId, operation } }) => {
      // Mark in progress
      const startAction = actions.sync.updateSyncOperation({
        accountId,
        operationId: operation.operationId,
        update: { status: 'InProgress', type: 'Indeterminate' },
      });

      // Do work, then complete or fail
      return concat(
        of(startAction),
        doWork().pipe(
          map(() =>
            actions.sync.completeSyncOperation({ accountId, operationId }),
          ),
          catchError(err =>
            of(
              actions.sync.failSyncOperation({
                accountId,
                operationId,
                error: 'sync.error.my-operation-failed',
              }),
            ),
          ),
        ),
      );
    }),
  );
```

**Full examples**:

- `packages/contract/cardano-context/src/store/side-effects/address-discovery-sync.ts`
- `packages/contract/cardano-context/src/store/side-effects/token-tracking-sync.ts`

### Pattern 3: Continuous Progress (Midnight)

Track progress from an observable source:

```typescript
wallet.syncProgress$.pipe(
  withLatestFrom(selectAccountSyncStatus$),
  switchMap(([progress, selectFn]) => {
    const status = selectFn(accountId);

    // Initialize if needed
    if (!status?.pendingSync) {
      return of(
        actions.sync.addSyncOperation({
          accountId,
          operation: {
            /* InProgress with progress */
          },
        }),
      );
    }

    // Update progress
    return of(
      actions.sync.updateSyncProgress({
        accountId,
        operationId,
        progress: Percent(progress),
      }),
    );
  }),
);
```

**Full example**: `packages/module/blockchain-midnight/src/store/side-effects.ts` (see `trackMidnightSyncProgress`)

## Translation Keys

Add operation descriptions to your i18n:

```json
{
  "sync": {
    "operation": {
      "my-operation": "Syncing my data"
    },
    "error": {
      "my-operation-failed": "Failed to sync my data"
    }
  }
}
```

## Key Concepts

**Sync Round**: A coordinated set of operations that must all complete successfully. The round succeeds only when all operations reach `Completed` status. If any operation fails, the round completes without updating `lastSuccessfulSync`.

**Operation Lifecycle**:

```
Pending → InProgress → Completed
                    → Failed
```

**Auto-completion**: When all operations in an account's `pendingSync` reach a terminal state (Completed or Failed), the `pendingSync` is automatically cleared and `lastSuccessfulSync` is updated (only if all succeeded).

## Architecture

- **State**: Per-account status with pending operations and last successful sync timestamp
- **Persistence**: Only `lastSuccessfulSync` is persisted; `pendingSync` is transient
- **Selectors**: Aggregate account statuses into global sync status

See ADR 12 for full architectural decision record.
