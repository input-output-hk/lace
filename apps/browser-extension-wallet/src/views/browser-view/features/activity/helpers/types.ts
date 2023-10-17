import type { AssetActivityItemProps } from '@lace/core';

export type TransformedActivity = Omit<AssetActivityItemProps, 'onClick'>;
