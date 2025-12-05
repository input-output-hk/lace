/* eslint-disable react/no-multi-comp*/
import React, { useCallback, useRef, useState } from 'react';
import classnames from 'classnames';
import { AssetInput, AssetInputProps } from './AssetInput';
import { ReactComponent as Close } from '../../assets/icons/close-icon.component.svg';
import styles from './AssetInputList.module.scss';
import { useOnClickOutside } from '@src/ui/hooks';

export const AssetInputRow = ({
  rowsLength,
  onDelete,
  idx,
  focused,
  onBlur,
  isPopupView,
  lockedRewardsTooltip,
  ...row
}: AssetInputProps & {
  onDelete?: () => void;
  rowsLength: number;
  idx: number;
  isPopupView?: boolean;
}): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { value, coin, maxDecimals } = row;
  const [isFocused, setIsFocused] = useState(focused);

  const onClick: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const { left, width } = e.currentTarget.getBoundingClientRect();
      const mouseXPosition = e.clientX - left;
      // eslint-disable-next-line no-magic-numbers
      const isInFocusableArea = mouseXPosition > width / 2;

      if (!isInFocusableArea)
        // do not apply compact notation in case we are still in the focusable area
        onBlur?.({
          value,
          id: coin.id,
          maxDecimals
        });
      setIsFocused(isInFocusableArea);
    },
    [coin?.id, maxDecimals, onBlur, value]
  );

  const onFocus = useCallback(
    (props) => {
      setIsFocused(true);
      row?.onFocus?.(props);
    },
    [row]
  );

  useOnClickOutside(
    containerRef,
    () => {
      setIsFocused(false);
      onBlur?.({
        value,
        id: coin.id,
        maxDecimals
      });
    },
    isFocused
  );

  return (
    <>
      <div id={`input-${idx}`} className={styles.assetRow} ref={containerRef} onClick={onClick}>
        <AssetInput
          {...row}
          focused={isFocused}
          setFocus={(focusState) => setIsFocused(focusState)}
          onBlur={onBlur}
          onFocus={onFocus}
          isPopupView={isPopupView}
          lockedRewardsTooltip={lockedRewardsTooltip}
        />
        {rowsLength > 1 && (
          <div
            onClick={onDelete}
            className={classnames(styles.close, { [styles.firstRow]: idx === 0 })}
            data-testid="asset-input-remove-button"
          >
            <Close className={styles.icon} />
          </div>
        )}
      </div>
      {idx !== rowsLength - 1 && <div className={styles.divider} />}
    </>
  );
};
