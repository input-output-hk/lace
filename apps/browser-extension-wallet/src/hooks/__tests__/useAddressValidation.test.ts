/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useAddressValidation } from '@hooks/useAddressValidation';
import * as addressValidators from '@src/utils/validators';

jest.mock('@src/utils/validators', () => {
  const original = jest.requireActual('@src/utils/validators');
  return {
    __esModule: true,
    ...original
  };
});

describe('Testing useAddressValidation hook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should execute action and return proper result', async () => {
    const isAddressValidResult = 'isAddressValidResult';
    const initialAddress = 'initialAddress';
    const isValidAddressSpy = jest
      .spyOn(addressValidators, 'isValidAddress')
      .mockReturnValueOnce(isAddressValidResult as any);
    const hook = renderHook((address: string) => useAddressValidation(address), {
      initialProps: initialAddress
    });

    expect(await hook.result.current.valid).toEqual(isAddressValidResult);
    expect(isValidAddressSpy).toBeCalledWith(initialAddress);

    const newAddress = 'newAddress';
    const newIsAddressValidResult = 'newIsAddressValidResult';
    isValidAddressSpy.mockReturnValueOnce(newIsAddressValidResult as any);

    hook.rerender(newAddress);

    expect(await hook.result.current.valid).toEqual(newIsAddressValidResult);
    expect(isValidAddressSpy).toBeCalledWith(newAddress);
    expect(isValidAddressSpy).toBeCalledTimes(2);

    hook.rerender(newAddress);
    expect(isValidAddressSpy).toBeCalledTimes(2);
  });
});
