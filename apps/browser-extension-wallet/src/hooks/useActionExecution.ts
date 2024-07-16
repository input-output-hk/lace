import { useTranslation } from 'react-i18next';
import { toast, ToastProps } from '@lace/common';
import ErrorIcon from '../assets/icons/address-error-icon.component.svg';
import type { TranslationKey } from '@lace/translation';

export const TOAST_DEFAULT_DURATION = 3;

export interface ActionExecutionArgs {
  successMessage?: string;
  toastDuration?: number;
  shouldDisplayToastOnSuccess?: boolean;
  getErrorMessage?: (error: Error) => TranslationKey;
}

export const useActionExecution = (
  params?: ActionExecutionArgs | undefined
): [(action: () => Promise<unknown>, actionParams?: ToastProps | undefined) => Promise<string>] => {
  const { t: translate } = useTranslation();
  const executeAction = async (action: () => Promise<string>, actionParams?: ToastProps | undefined) => {
    try {
      const res = await action();
      if (params?.shouldDisplayToastOnSuccess && actionParams) {
        toast.notify({ duration: TOAST_DEFAULT_DURATION, ...actionParams });
      }
      return res;
    } catch (error) {
      const errorMessage = params?.getErrorMessage ? translate(params.getErrorMessage(error)) : error.message;
      toast.notify({
        text: errorMessage,
        duration: params?.toastDuration || TOAST_DEFAULT_DURATION,
        icon: ErrorIcon
      });
      return Promise.reject(errorMessage);
    }
  };

  return [executeAction];
};
