import { renderHook } from '@testing-library/react-hooks';
import { useUpdateAddressStatus } from '../useUpdateAddressStatus';
import { CustomConflictError, ensureHandleOwnerHasntChanged } from '@src/utils/validators';
import { Asset, Cardano, HandleProvider } from '@cardano-sdk/core';

jest.mock('@src/utils/validators', () => ({
  ...jest.requireActual<any>('@src/utils/validators'), // eslint-disable-line @typescript-eslint/no-explicit-any
  ensureHandleOwnerHasntChanged: jest.fn()
}));

const cardanoAddress = Cardano.PaymentAddress(
  'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g'
);
const mockHandleResolution = {
  addresses: { cardano: cardanoAddress },
  backgroundImage: Asset.Uri('ipfs://zrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3yd'),
  cardanoAddress,
  handle: 'bob',
  hasDatum: false,
  image: Asset.Uri('ipfs://c8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe'),
  policyId: Cardano.PolicyId('50fdcdbfa3154db86a87e4b5697ae30d272e0bbcfa8122efd3e301cb'),
  profilePic: Asset.Uri('ipfs://zrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3yd1')
};

describe('useUpdateAddressStatus', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  const mockHandleResolver = {
    resolveHandles: jest.fn(),
    healthCheck: jest.fn(),
    getPolicyIds: jest.fn()
  } as HandleProvider;
  const addressList = [
    { id: 1, name: 'one', address: 'address1', handleResolution: mockHandleResolution, network: 1 },
    { id: 2, name: 'two', address: 'address2', handleResolution: mockHandleResolution, network: 1 }
  ];

  it('sets addresses to valid when handles resolve correctly', async () => {
    (ensureHandleOwnerHasntChanged as jest.Mock).mockResolvedValue(true);
    const { result, waitForNextUpdate } = renderHook(() => useUpdateAddressStatus(addressList, mockHandleResolver));

    await waitForNextUpdate();

    expect(result.current).toEqual({
      address1: { isValid: true },
      address2: { isValid: true }
    });
  });

  it('sets an address as invalid if a handle resolves with an error', async () => {
    const handleError = new CustomConflictError({
      message: 'Unexpected values',
      expectedAddress: cardanoAddress,
      actualAddress: cardanoAddress
    });

    (ensureHandleOwnerHasntChanged as jest.Mock).mockResolvedValueOnce(true).mockRejectedValueOnce(handleError);

    const { result, waitForNextUpdate } = renderHook(() => useUpdateAddressStatus(addressList, mockHandleResolver));

    await waitForNextUpdate();

    expect(result.current).toEqual({
      address1: { isValid: true },
      address2: { isValid: false, error: handleError }
    });
  });
});
