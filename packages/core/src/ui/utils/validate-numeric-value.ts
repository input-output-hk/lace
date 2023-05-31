interface ValidationConfig {
  isFloat: boolean;
  maxDecimals?: string;
}

export const validateNumericValue = (value: string, config?: ValidationConfig): boolean => {
  const validInpupRegExp = config?.isFloat
    ? new RegExp(`^([0-9]+)(\\.{1})?(\\d{1,${config?.maxDecimals || ''}})?$`)
    : new RegExp('^\\d+$');
  return validInpupRegExp.test(value);
};
