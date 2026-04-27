import {
  noop,
  type MonoTypeOperatorFunction,
  type ObservableInput,
} from 'rxjs';
import { innerFrom } from 'rxjs/internal/observable/innerFrom';
import { createOperatorSubscriber } from 'rxjs/internal/operators/OperatorSubscriber';
import { operate } from 'rxjs/internal/util/lift';

/**
 * Similar to RxJS 'sample' operator (copied and adapted the implementation),
 * but will emit every time the notifier emits when it has value,
 * even if the source value hasn't changed since the last emission
 */
export const sampleWithDuplicates = <T>(
  notifier: ObservableInput<unknown>,
): MonoTypeOperatorFunction<T> =>
  operate((source, subscriber) => {
    let lastValue: T | null = null;
    source.subscribe(
      createOperatorSubscriber(subscriber, value => {
        lastValue = value;
      }),
    );
    innerFrom(notifier).subscribe(
      createOperatorSubscriber(
        subscriber,
        () => {
          if (lastValue) {
            subscriber.next(lastValue);
          }
        },
        noop,
      ),
    );
  });
