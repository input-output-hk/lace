import { useObservable } from '@lace/common';
import { PasswordObj as Password } from '@ui/components/Password';
import { BehaviorSubject } from 'rxjs';

const NO_PASSWORD: Partial<Password> = {};
const globalPassword$ = new BehaviorSubject<Partial<Password>>(NO_PASSWORD);
const globalPasswordConfirmation$ = new BehaviorSubject<Partial<Password>>(NO_PASSWORD);
const globalPasswordConfirmationRepeat$ = new BehaviorSubject<Partial<Password>>(NO_PASSWORD); // used for nami password reset

const deletePasswordValues = (password$: BehaviorSubject<Partial<Password>>) => {
  if (password$.value.input) {
    password$.value.input.value = '';
    delete password$.value.input;
  }
  delete password$.value.value;
};

const setPassword = (pw: Partial<Password>) => {
  globalPassword$.next(pw);
};

const setPasswordConfirmation = (pw: Partial<Password>) => {
  globalPasswordConfirmation$.next(pw);
};

// used for nami password reset
const setPasswordConfirmationRepeat = (pw: Partial<Password>) => {
  globalPasswordConfirmationRepeat$.next(pw);
};

const clearSecrets = () => {
  deletePasswordValues(globalPassword$);
  setPassword(NO_PASSWORD);
  deletePasswordValues(globalPasswordConfirmation$);
  setPasswordConfirmation(NO_PASSWORD);
  deletePasswordValues(globalPasswordConfirmationRepeat$);
  // used for nami password reset
  setPasswordConfirmationRepeat(NO_PASSWORD);
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useSecrets = () => {
  const password = useObservable(globalPassword$, NO_PASSWORD);
  const passwordConfirmation = useObservable(globalPasswordConfirmation$, NO_PASSWORD);
  // used for nami password reset
  const repeatedPassword = useObservable(globalPasswordConfirmationRepeat$, NO_PASSWORD);

  return {
    clearSecrets,
    password,
    setPassword,
    passwordConfirmation,
    setPasswordConfirmation,
    // used for nami password reset
    repeatedPassword,
    setPasswordConfirmationRepeat
  };
};
