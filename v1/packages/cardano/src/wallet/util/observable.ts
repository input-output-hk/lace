import { defer, Observable } from 'rxjs';

// lift a (possibly side-effecting) thunk into an observable, executed only after it is subscribed
export const deferSync = <T>(thunk: () => T): Observable<T> => defer(() => Promise.resolve(thunk()));
