/**
 * NFTItem render cost at production fidelity: the cell NftGrid renders per NFT
 * on the portfolio NFTs tab. 24 cells ≈ a full visible grid page; the grid
 * container itself belongs to the consuming screen, so a plain View isolates
 * the per-cell cost (same approach as the TokenItem suite).
 */
import React from 'react';
import { View } from 'react-native';
import { measureRenders } from 'reassure';

import { NFTItem } from '../src';

import { makeNftItemProps } from './fixtures/nfts';
import { expectMounted, PerfProviders } from './testUtils';

const CELLS = 24;
const nfts = makeNftItemProps(CELLS);

test('NFTItem × 24 — grid page, initial render', async () => {
  await measureRenders(
    <View>
      {nfts.map(nft => (
        <NFTItem key={nft.testID} {...nft} />
      ))}
    </View>,
    { scenario: expectMounted('perf-nft-0'), wrapper: PerfProviders },
  );
});
