/**
 * Deterministic props for the ui-toolkit DAppCard grid benchmark, in the
 * shape the dapp explorer feeds each cell (dappExplorerPage template:
 * logoUrl / name / categoriesText). No Date.now()/Math.random().
 */
import type React from 'react';

import type { DAppCard } from '../../src';

type DAppCardProps = React.ComponentProps<typeof DAppCard>;

const DAPPS = ['Minswap', 'SundaeSwap', 'JPG Store', 'Lenfi', 'Indigo'];
const CATEGORIES = ['DeFi', 'DeFi, DEX', 'NFT Marketplace', 'Lending', 'CDP'];

export const makeDAppCardProps = (count: number): DAppCardProps[] =>
  Array.from({ length: count }, (_, index) => ({
    name: `${DAPPS[index % DAPPS.length]} ${index}`,
    description: CATEGORIES[index % CATEGORIES.length],
    avatarImage: `https://dapp.example/${index}.png`,
  }));
