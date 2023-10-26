import type { AssetActivityItemProps } from '@lace/core';

export type TransformedTx = Omit<AssetActivityItemProps, 'onClick'>;
