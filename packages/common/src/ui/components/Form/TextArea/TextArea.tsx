import React, { useState, useEffect, useRef, useCallback } from 'react';
import cn from 'classnames';
import { Input } from 'antd';
import type { TextAreaRef } from 'antd/lib/input/TextArea';

import styles from './TextArea.module.scss';

const { TextArea: AntdTextArea } = Input;
const updateDelayMs = 100;

export type textAreaProps = {
  wrapperClassName?: string;
  className?: string;
  dataTestId?: string;
  invalid?: boolean;
  isResizable?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  value?: string;
  label?: string;
  rows?: number;
};

export const TextArea = ({
  wrapperClassName,
  className,
  dataTestId,
  invalid,
  isResizable,
  value,
  onChange,
  label,
  onBlur,
  ...props
}: textAreaProps): React.ReactElement => {
  const ref = useRef<TextAreaRef>();
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [localVal, setLocalVal] = useState<string>('');

  const resizeArea = useCallback(() => {
    if (!ref?.current || !label) return;
    ref.current.resizableTextArea.textArea.style.height = '56px';
    ref.current.resizableTextArea.textArea.style.height = `${ref.current?.resizableTextArea?.textArea.scrollHeight}px`;
  }, [label]);

  const onValChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalVal(e?.target?.value ?? '');
    onChange?.(e);
    setTimeout(resizeArea, updateDelayMs);
  };

  useEffect(() => {
    setLocalVal(value);
    setTimeout(resizeArea);
  }, [value, resizeArea]);

  return (
    <div className={cn(styles.wrapper, wrapperClassName)}>
      {label && (
        <span className={cn('text-area-label', styles.label, { [styles.focused]: isFocused || localVal })}>
          {label}
        </span>
      )}
      <AntdTextArea
        ref={ref}
        onFocus={() => setIsFocused(true)}
        onBlur={(event) => {
          setIsFocused(false);
          if (onBlur) {
            onBlur(event);
          }
        }}
        onChange={onValChange}
        data-testid={dataTestId}
        value={localVal}
        autoSize
        rows={props.rows || 1}
        className={cn(styles.textArea, {
          [className]: className,
          [styles.isResizable]: isResizable,
          [styles.empty]: !value,
          [styles.withLabel]: label,
          [styles.invalid]: invalid
        })}
        {...props}
      />
    </div>
  );
};
