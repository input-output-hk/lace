export const camelToKebab = (value: string): string =>
  value.replace(/([\da-z]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
