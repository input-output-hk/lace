# @lace-contract/wallet-active-state

Exposes `isWalletActive$` as a side-effect dependency so periodic pipelines
(polling, watchers, long-lived connections) can pause while the wallet is
inactive and resume when it becomes active again.

## What it provides

- `walletActiveStateDependencyContract` — `sideEffectDependency` contract
  that surfaces `isWalletActive$: Observable<boolean>` to any side effect
  whose contract or module declares it in `dependsOn`.
- `whileActive(isWalletActive$)` — RxJS operator that gates a source
  observable on `isWalletActive$`. Place it at the **end** of a polling
  pipeline so lock-induced unsubscription tears down the entire upstream
  chain (intervals, in-flight requests, WebSocket connections via
  `finalize`).

## Why it lives in its own contract

The gating primitive is split from `@lace-contract/app-lock` so that
SDK-bundled contracts can depend on it without transitively pulling in
`@lace-contract/authentication-prompt` (which uses
`react-i18next`/`react`). This keeps the headless SDK bundle free of
React dependencies.

## Usage

```ts
import { whileActive } from '@lace-contract/wallet-active-state';

const trackTip: SideEffect = (
  _,
  { cardanoContext: { selectChainId$ } },
  { actions, cardanoProvider: { getTip }, isWalletActive$ },
) =>
  selectChainId$.pipe(
    filter(Boolean),
    switchMap(chainId =>
      merge(of(void 0), interval(tipPollFrequency)).pipe(
        exhaustMap(() => getTip({ chainId })),
        map(result => actions.cardanoContext.setTip(result.value)),
      ),
    ),
    whileActive(isWalletActive$),
  );
```

The contract or module containing the side effect must declare
`walletActiveStateDependencyContract` in its `dependsOn`. The
`@lace-module/app-lock` module implements it (wired to lock state); the
`@lace-sdk` base module provides a default of `of(true)` so headless
wallets always poll.
