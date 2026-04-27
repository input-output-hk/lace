# @lace-contract/failures

## Purpose

Provides unified failure tracking and retry mechanisms across the Lace platform. This contract replaces ad-hoc error handling patterns with a consistent approach that supports transparent retries, natural retries, and user-initiated manual retries.

## Why This Contract Exists

Provides centralized failure tracking to support three retry mechanisms: **transparent** (automatic retries before user sees error), **natural** (retry on system triggers like tip changes), and **manual** (user-initiated via "Try Again" button).

See **ADR 15** for detailed rationale, retry decision matrix, and implementation patterns.

## Core Concepts

### Failure Tracking

- **Redux State**: Failures stored in `state.failures.failures` (Record<string, Failure>)
- **Actions**: `addFailure` (add/update), `dismissFailure` (remove)
- **Selectors**: `selectAllFailures`, `selectFailureById`

### Stable Failure IDs (ADR 13)

Failure IDs must be **stable across retry attempts** (based on operation type + context, not operation instance ID) to enable auto-dismissal. See `src/value-objects/failure-id.vo.ts` for base type. Domain-specific IDs extend this base using ADR 13 hierarchical pattern.

### Auto-Dismissal Utility

`autoDismissFailureOnSuccess` (see `src/utils/auto-dismiss-failure-on-success.ts`) is an RxJS operator that:

1. Checks if failure exists before dismissing (prevents unnecessary actions)
2. Emits `dismissFailure` action only when failure is present
3. Used in side effects after successful operation completion

## Usage Patterns

### Basic Pattern

```typescript
import { retryBackoff } from 'backoff-rxjs';
import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';

// In side effect: transparent retry → add failure on exhaustion → auto-dismiss on success
operation$.pipe(
  retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG), // Transparent retry
  mergeMap(result =>
    merge(
      of(actions.operationSucceeded(result)),
      of(OperationFailureId(accountId)).pipe(
        autoDismissFailureOnSuccess(selectFailureById$), // Auto-dismiss
      ),
    ),
  ),
  catchError(() =>
    of(
      actions.failures.addFailure({
        failureId: OperationFailureId(accountId),
        message: 'operation.error',
        retryAction: actions.retryOperation({ accountId }), // Optional manual retry
      }),
    ),
  ),
);
```

See **ADR 15** for complete implementation patterns (transparent, natural, manual retry).

### Defining Domain-Specific Failure IDs

Place specialized failure IDs in domain modules (ADR 13):

```typescript
// packages/module/blockchain-midnight/src/value-objects/midnight-wallet-failure-id.vo.ts
import { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';

export type MidnightWalletFailureId = FailureId &
  Tagged<string, 'MidnightWalletFailureId'>;
export const MidnightWalletFailureId = (
  accountId: AccountId,
): MidnightWalletFailureId =>
  `midnight-wallet-${accountId}` as MidnightWalletFailureId;
```

## Architecture References

- **ADR 15**: Error Handling with Three Retry Mechanisms - retry strategies, patterns, and decision matrix
- **ADR 13**: Use Value Objects with Hierarchical Typing - FailureId hierarchy and construction
- **Error Classification**: `packages/lib/util-provider/src/is-retriable-error.ts`
- **Retry Config**: `packages/lib/util-provider/src/retry-config.ts`

## Related Contracts

- `@lace-contract/wallet-repo` - Provides base AccountId for failure IDs
- `@lace-contract/i18n` - Provides TranslationKey type for failure messages
