import { SubmissionError } from '@midnightntwrk/wallet-sdk/capabilities/submission';
import {
  NodeClientError,
  PolkadotNodeClient,
} from '@midnightntwrk/wallet-sdk/node-client/effect';
import { SerializedTransaction } from '@midnightntwrk/wallet-sdk-abstractions';
import { Effect, Exit, Option, Scope, Stream } from 'effect';

import type { FinalizedTransaction } from '@midnight-ntwrk/ledger-v8';
import type {
  SubmissionEvent,
  SubmissionService,
} from '@midnightntwrk/wallet-sdk/capabilities/submission';

const observers = new WeakMap<
  FinalizedTransaction,
  (stage: SubmissionEvent['_tag']) => void
>();

// SDK initialization and each submission request a disconnect, but Polkadot's
// disconnect() resolves before the socket closes and isConnected becomes false.
const awaitDisconnection = (client: PolkadotNodeClient) =>
  Effect.async<void>(resume => {
    if (!client.api.isConnected) {
      resume(Effect.void);
      return;
    }
    const disconnected = () => {
      resume(Effect.void);
    };
    client.api.once('disconnected', disconnected);
    return Effect.sync(() => client.api.off('disconnected', disconnected));
  });

/** Exact object ownership: unrelated dApp submissions cannot update a wallet send. */
export const observeSubmission = (
  tx: FinalizedTransaction,
  report: (stage: SubmissionEvent['_tag']) => void,
) => {
  observers.set(tx, report);
  return () => {
    observers.delete(tx);
  };
};

/** Preserve facade submission/rollback semantics while observing its single stream. */
export const createProgressSubmissionService = ({
  relayURL,
}: {
  relayURL: URL;
}): SubmissionService<FinalizedTransaction> => {
  // Reuse metadata, but serialize sends: the SDK disconnects after each stream.
  const scope = Effect.runSync(Scope.make());
  const submissions = Effect.runSync(Effect.makeSemaphore(1));
  const connection = PolkadotNodeClient.make({ nodeURL: relayURL }).pipe(
    Effect.provideService(Scope.Scope, scope),
    Effect.tap(awaitDisconnection),
    Effect.cached,
    Effect.runSync,
  );
  const submit = async (
    tx: FinalizedTransaction,
    waitFor: SubmissionEvent['_tag'] = 'InBlock',
  ) => {
    const serialized = SerializedTransaction.from(tx);
    return connection.pipe(
      Effect.flatMap(client =>
        client.sendMidnightTransaction(serialized).pipe(
          Stream.tap(event =>
            Effect.sync(() => observers.get(tx)?.(event._tag)),
          ),
          Stream.find(event => event._tag === waitFor),
          Stream.runHead,
          Effect.flatMap(
            Option.match({
              onSome: Effect.succeed,
              onNone: () =>
                Effect.fail(
                  new NodeClientError.TransactionProgressError({
                    message: 'Transaction did not reach desired stage',
                    txData: serialized,
                    desiredStage: waitFor,
                  }),
                ),
            }),
          ),
          Effect.ensuring(awaitDisconnection(client)),
        ),
      ),
      submissions.withPermits(1),
      Effect.mapError(
        cause =>
          new SubmissionError({
            message: 'Transaction submission error',
            cause,
          }),
      ),
      Effect.runPromise,
    );
  };
  return {
    // The runtime selects the requested tag above; SDK expresses this as overloads.
    submitTransaction:
      submit as SubmissionService<FinalizedTransaction>['submitTransaction'],
    close: async () =>
      Scope.close(scope, Exit.void).pipe(
        Effect.ignoreLogged,
        Effect.runPromise,
      ),
  };
};
