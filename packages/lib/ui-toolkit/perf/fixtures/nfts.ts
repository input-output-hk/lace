/**
 * Deterministic props for the ui-toolkit NFTItem grid render benchmark, in the
 * shape NftGrid feeds each cell
 * (packages/next/ui/src/screens/Portfolio/nfts/NftGrid.tsx): image uri, label,
 * fixed cell size, rounded shape, pressable. No Date.now()/Math.random().
 */
import type React from 'react';

import noop from 'lodash/noop';

import type { NFTItem } from '../../src';

type NftItemProps = React.ComponentProps<typeof NFTItem>;

const COLLECTIONS = ['SpaceBud', 'ClayNation', 'Pavia', 'DEADPXLZ'];

export const makeNftItemProps = (count: number): NftItemProps[] =>
  Array.from({ length: count }, (_, index) => ({
    image: { uri: `https://nft.example/${index}.png` },
    label: `${COLLECTIONS[index % COLLECTIONS.length]} #${index}`,
    size: 145,
    shape: 'rounded' as const,
    onPress: noop,
    testID: `perf-nft-${index}`,
  }));
