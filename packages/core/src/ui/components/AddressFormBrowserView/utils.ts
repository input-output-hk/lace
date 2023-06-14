/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const getValidator =
  (validate: (val: string) => string) =>
  (_rule: any, value: string): Promise<void> => {
    const res = validate(value);
    return res ? Promise.reject(res) : Promise.resolve();
  };
