import type { Dapp, DappId } from '../src';

export const generateMockDapp = (id: DappId): Dapp => ({
  id,
  imageUrl: 'some-mock-url.jpg',
  name: `Dapp ${id}`,
  origin: 'mock-origin',
});
