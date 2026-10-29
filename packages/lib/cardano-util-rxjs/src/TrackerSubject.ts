import { ReplaySubject } from 'rxjs';

import type { Observable, Subscription } from 'rxjs';

type NO_VALUE_TYPE = 'TRACKER_SUBJECT_NO_VALUE';

export interface BehaviorObservable<T> extends Observable<T> {
  get value(): NO_VALUE_TYPE | T;
}

export class TrackerSubject<T>
  extends ReplaySubject<T>
  implements BehaviorObservable<T>
{
  static NO_VALUE: NO_VALUE_TYPE = 'TRACKER_SUBJECT_NO_VALUE';

  #sourceSubscription$: Subscription;
  #value: NO_VALUE_TYPE | T = 'TRACKER_SUBJECT_NO_VALUE';
  get value(): NO_VALUE_TYPE | T {
    return this.#value;
  }
  constructor(source$: Observable<T>) {
    super(1);
    this.#sourceSubscription$ = source$.subscribe(this);
  }
  next(value: T) {
    this.#value = value;
    super.next(value);
  }
  complete() {
    this.#sourceUnsubscribe();
    super.complete();
  }
  error(err: unknown) {
    this.#sourceUnsubscribe();
    super.error(err);
  }
  unsubscribe() {
    this.#sourceUnsubscribe();
    super.unsubscribe();
  }
  #sourceUnsubscribe() {
    // can be undefined if source observable completes immediatelly upon subscription in constructor
    if (this.#sourceSubscription$) this.#sourceSubscription$.unsubscribe();
  }
}
