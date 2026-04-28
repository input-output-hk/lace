import {
  classifyHardwareError,
  type HardwareErrorCategory,
} from './classify-hardware-error';

export interface HwSigningErrorTranslationKeys {
  title: `hw-error.${HardwareErrorCategory}.title`;
  subtitle: `hw-error.${HardwareErrorCategory}.subtitle`;
}

export const mapHwSigningError = (
  error: unknown,
): HwSigningErrorTranslationKeys => {
  const category = classifyHardwareError(error);
  return {
    title: `hw-error.${category}.title`,
    subtitle: `hw-error.${category}.subtitle`,
  };
};
