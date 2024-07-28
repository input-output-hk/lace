import React from 'react';
import classnames from 'classnames';
import { Button } from '@lace/common';
import styles from './SendReceive.module.scss';
import { ReactComponent as ArrowDiagonalDown } from '../../assets/icons/arrow-diagonal-down.component.svg';
import { ReactComponent as ArrowDiagonalUp } from '../../assets/icons/arrow-diagonal-up.component.svg';
import { TranslationsFor } from '@ui/utils/types';

export interface SendReceiveProps {
  leftButtonLabel?: string;
  leftButtonOnClick?: () => void;
  rightButtonLabel?: string;
  rightButtonOnClick?: () => void;
  isReversed?: boolean;
  popupView?: boolean;
  sharedClass?: string;
  translations: TranslationsFor<'send' | 'receive'>;
}

export const SendReceive = ({
  translations,
  leftButtonLabel = translations.send,
  leftButtonOnClick,
  rightButtonLabel = translations.receive,
  rightButtonOnClick,
  isReversed = false,
  popupView = false,
  sharedClass
}: SendReceiveProps): React.ReactElement => (
  <div
    className={classnames(styles.buttonsContainer, isReversed && styles.reversed, popupView && styles.popupContainer)}
    data-testid="send-receive-container"
  >
    <Button className={sharedClass} block onClick={leftButtonOnClick} color="gradient" data-testid="send-button">
      <ArrowDiagonalUp className={popupView ? styles.popupIconArrowUp : styles.iconArrowUp} />
      {leftButtonLabel}
    </Button>
    <Button className={sharedClass} block onClick={rightButtonOnClick} color="gradient" data-testid="receive-button">
      <ArrowDiagonalDown className={popupView ? styles.popupIconArrowDown : styles.iconArrowDown} />
      {rightButtonLabel}
    </Button>
  </div>
);
