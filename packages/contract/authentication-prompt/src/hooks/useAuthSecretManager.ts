import { useObservable } from '@lace-lib/util-render';
import { useCallback, useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

type AuthSecret$State = {
  input?: HTMLInputElement;
  chars: string[];
};

type SetAuthSecretPayload = {
  input?: HTMLInputElement;
  value: string;
};

// Factory function to create a fresh, empty auth secret state.
// This is important to avoid shared mutable objects.
const createInitialAuthSecretState = (): AuthSecret$State => ({
  chars: [],
});

const overwriteChars = (chars: string[]): void => {
  for (let index = 0; index < chars.length; index++) {
    chars[index] = '\0'; // Overwrite with null character
  }
  chars.length = 0;
};

export const useAuthSecretManager = () => {
  const authSecret$ = useMemo(
    () => new BehaviorSubject<AuthSecret$State>(createInitialAuthSecretState()),
    [],
  );
  const authSecretState = useObservable(
    authSecret$,
    createInitialAuthSecretState,
  );

  const setAuthSecret = useCallback(
    (payload: SetAuthSecretPayload) => {
      const oldAuthSecretState = authSecret$.getValue();

      if (oldAuthSecretState.chars.length > 0) {
        overwriteChars(oldAuthSecretState.chars);
      }

      const newChars = payload.value.split('');
      const newState: AuthSecret$State = { chars: newChars };
      if (payload.input) {
        newState.input = payload.input;
      }
      authSecret$.next(newState);
    },
    [authSecret$],
  );

  const clearAuthSecret = useCallback(() => {
    const currentAuthSecretState = authSecret$.getValue();

    if (currentAuthSecretState.chars.length > 0) {
      overwriteChars(currentAuthSecretState.chars);
    }

    if (currentAuthSecretState.input) {
      currentAuthSecretState.input.value = '';
    }

    authSecret$.next(createInitialAuthSecretState());
  }, [authSecret$]);

  const isAuthSecretPresent = useMemo(
    () => authSecretState.chars.length > 0,
    [authSecretState],
  );

  // This will clear the auth secret on component unmount.
  useEffect(() => {
    return () => {
      clearAuthSecret();
    };
  }, [clearAuthSecret]);

  return {
    clearAuthSecret,
    getAuthSecret: (): string => authSecretState.chars.join(''),
    isAuthSecretPresent,
    setAuthSecret,
  };
};
