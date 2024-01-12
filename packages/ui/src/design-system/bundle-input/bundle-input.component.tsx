import React, { Fragment } from 'react';
import type { PropsWithChildren } from 'react';

import { ReactComponent as PlusSmall } from '@lace/icons/dist/PlusSmallComponent';

import { AssetInput } from '../asset-input';
import { Box } from '../box';
import * as ControlButtons from '../control-buttons';
import { Divider } from '../divider';

import * as cx from './bundle-input.css';
import { RemoveButton } from './remove-button.component';

import type { Data } from '../asset-input';

export type Props = PropsWithChildren<{
  state?: Data.AssetState[];
  onAddAsset?: () => void;
  onRemoveAsset?: (asset: Readonly<Data.Asset>) => void;
  onAmountChange?: (asset: Readonly<Data.Asset>, amount: string) => void;
  onTickerClick?: (asset: Readonly<Data.Asset>) => void;
  onMaxClick?: (asset: Readonly<Data.Asset>) => void;
}>;

export const BundleInput = ({
  state = [],
  onRemoveAsset,
  onAddAsset,
  onAmountChange,
  onTickerClick,
  onMaxClick,
}: Readonly<Props>): JSX.Element => (
  <div className={cx.root}>
    {state.map((currentState, index) => (
      <Fragment key={currentState.asset.id}>
        {index > 0 && <Divider my="$32" />}
        <Box
          className={cx.itemBox}
          data-testid={`bundle-input-asset-${currentState.asset.id}`}
        >
          <AssetInput
            state={currentState}
            onTickerClick={onTickerClick}
            onAmountChange={onAmountChange}
            onMaxClick={onMaxClick}
          />
          {state.length > 1 && (
            <Box className={cx.removeButtonBox}>
              <RemoveButton
                onClick={(): void => onRemoveAsset?.(currentState.asset)}
                data-testid={`bundle-input-remove-button-${currentState.asset.id}`}
              />
            </Box>
          )}
        </Box>
      </Fragment>
    ))}
    <Box my="$24">
      <ControlButtons.Filled
        onClick={onAddAsset}
        label="Add Asset"
        icon={<PlusSmall className={cx.icon} />}
        w="$fill"
        data-testid="bundle-input-add-asset-button"
      />
    </Box>
  </div>
);
