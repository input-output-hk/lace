import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { Tooltip } from 'antd';
import debounce from 'lodash/debounce';
import cn from 'classnames';
import { addEllipsis, getTextWidth, trimTextInHalfToFitSize } from '@src/ui/lib';
import styles from './Ellipsis.module.scss';

const DEFAULT_LENGTH = 5;
const DEFAULT_DEBOUNCE = 200;

export interface EllipsisProps {
  /**
   * Style theme
   */
  theme?: string;
  /**
   * Full text to be shortened
   */
  text: string;
  /**
   * Amount of characters before the ellipsis
   */
  beforeEllipsis?: number;
  /**
   * Amount of characters after the ellipsis
   */
  afterEllipsis?: number;
  /**
   * Display a tooltip with full text on hover. Default: `true`
   */
  withTooltip?: boolean;
  /**
   * Stretch the text to fit one row full width, equeal amount (+-1) of characters from both sides.
   */
  ellipsisInTheMiddle?: boolean;
  /**
   * class name attached to the root element
   */
  className?: string;
  /**
   * class name attached to the direct text parent
   */
  textClassName?: string;
  /**
   * test id data attr
   */
  dataTestId?: string;
  /**
   * tooltip id - for testing purposes
   */
  tooltipId?: string;
}

export const Ellipsis = ({
  theme,
  text,
  beforeEllipsis: beforeLength = DEFAULT_LENGTH,
  afterEllipsis: afterLength = DEFAULT_LENGTH,
  ellipsisInTheMiddle,
  withTooltip = true,
  textClassName,
  className,
  dataTestId,
  tooltipId
}: EllipsisProps): React.ReactElement => {
  const [content, setContent] = React.useState<string>(text);
  const ref = useRef<HTMLDivElement>(null);

  const addEllipsisInTheMiddle = useCallback(() => {
    if (!ellipsisInTheMiddle || !ref?.current) return;

    if (getTextWidth(text, ref.current) > ref.current.offsetWidth) {
      setContent(trimTextInHalfToFitSize(text, ref.current));
      return;
    }
    setContent(text);
  }, [text, ellipsisInTheMiddle]);

  const debouncedAddEllipsis = useMemo(
    () => debounce(addEllipsisInTheMiddle, DEFAULT_DEBOUNCE),
    [addEllipsisInTheMiddle]
  );

  useEffect(() => {
    window.addEventListener('resize', debouncedAddEllipsis);
    debouncedAddEllipsis();
    return () => {
      window.removeEventListener('resize', debouncedAddEllipsis);
    };
  }, [debouncedAddEllipsis]);

  useEffect(() => {
    addEllipsisInTheMiddle();
  }, [addEllipsisInTheMiddle]);

  const children = (
    <p data-testid={'ellipsis-text'} className={cn(theme && styles[theme], textClassName)}>
      {ellipsisInTheMiddle ? content : addEllipsis(text, beforeLength ?? DEFAULT_LENGTH, afterLength ?? DEFAULT_LENGTH)}
    </p>
  );

  return (
    <div
      style={{ ...(ellipsisInTheMiddle && { width: '100%' }) }}
      ref={ref}
      data-testid={dataTestId || 'ellipsis-container'}
      className={className}
    >
      {withTooltip && (
        <Tooltip id={tooltipId} title={text}>
          {children}
        </Tooltip>
      )}
      {!withTooltip && children}
    </div>
  );
};
