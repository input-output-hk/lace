import type { AppStateStatus } from 'react-native';

import { AppState } from 'react-native';
import { Observable } from 'rxjs';

export const appState$ = new Observable<AppStateStatus>(subscriber => {
  subscriber.next(AppState.currentState);
  const subscription = AppState.addEventListener('change', nextState => {
    subscriber.next(nextState);
  });
  return () => {
    subscription.remove();
  };
});
