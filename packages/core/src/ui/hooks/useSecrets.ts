import { useState } from 'react';

let passwordLocal = '';
let passwordConfirmLocal = '';

export const useSecrets = () => {
  const [password, setPassword] = useState(passwordLocal);
  const [passwordConfirm, setPasswordConfirm] = useState(passwordConfirmLocal);

  const handleSetPassword = (newPassword: string) => {
    passwordLocal = newPassword;
    setPassword(newPassword);
  };
  const handleSetPasswordConfirm = (newPassword: string) => {
    passwordConfirmLocal = newPassword;
    setPasswordConfirm(newPassword);
  };

  return {
    password,
    passwordConfirm,
    setPassword: handleSetPassword,
    setPasswordConfirm: handleSetPasswordConfirm
  };
};
