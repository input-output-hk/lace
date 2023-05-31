/* eslint-disable react/no-multi-comp*/
import React from 'react';
import { Button } from '@lace/common';
import { AssetInputProps } from './AssetInput';
import { ReactComponent as Plus } from '../../assets/icons/plus-default.component.svg';

import styles from './AssetInputList.module.scss';
import { TranslationsFor } from '@src/ui/utils/types';
import { AssetInputRow } from './AssetInputRow';

export interface AssetInputListProps {
  rows: Array<
    AssetInputProps & {
      onDelete?: () => void;
    }
  >;
  onAddAsset?: () => void;
  disabled?: boolean;
  translations: TranslationsFor<'addAsset'>;
}

export const AssetInputList = ({
  rows,
  onAddAsset,
  disabled,
  translations
}: AssetInputListProps): React.ReactElement => (
  <div className={styles.assetInputContainer} data-testid="asset-input-container">
    {rows.map((row, idx) => (
      <AssetInputRow key={`${row.coin.id}-${idx}`} {...row} idx={idx} rowsLength={rows.length} />
    ))}
    <Button
      className={styles.customBtn}
      disabled={disabled}
      color="secondary"
      block
      size="small"
      onClick={onAddAsset}
      data-testid="asset-add-button"
    >
      <Plus className={styles.plusIcon} />
      <p>{translations.addAsset}</p>
    </Button>
  </div>
);
