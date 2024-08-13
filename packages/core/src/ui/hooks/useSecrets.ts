import { useObservable } from '@lace/common';
import { PasswordObj as Password } from '@ui/components/Password';
import { BehaviorSubject } from 'rxjs';

const NO_PASSWORD: Partial<Password> = {};
const globalPassword$ = new BehaviorSubject<Partial<Password>>(NO_PASSWORD);
const globalPasswordConfirmation$ = new BehaviorSubject<Partial<Password>>(NO_PASSWORD);

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

const clearSecrets = () => {
  deletePasswordValues(globalPassword$);
  setPassword(NO_PASSWORD);
  deletePasswordValues(globalPasswordConfirmation$);
  setPasswordConfirmation(NO_PASSWORD);
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useSecrets = () => {
  const password = useObservable(globalPassword$, NO_PASSWORD);
  const passwordConfirmation = useObservable(globalPasswordConfirmation$, NO_PASSWORD);

  return {
    clearSecrets,
    password,
    setPassword,
    passwordConfirmation,
    setPasswordConfirmation
  };
};
