import React, { useLayoutEffect, useRef, useState } from 'react';
import { allowedCharactersRegex } from './constants';
import styles from './SpanInput.module.scss';

const initialValueBuffer = [Buffer.from('', 'utf8')];

export const SpanInput = () => {
  const fakeValueRef = useRef('');
  const [fakeValueBuffer, setFakeValueBuffer] = useState(initialValueBuffer);
  const fakeInputRef = useRef<HTMLSpanElement | null>(null);
  const fakeInputAnimationFrameRef = useRef<number | null>(null);

  const onFakePasswordInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Backspace') {
      if (fakeValueBuffer[0].length === 0) return;

      setFakeValueBuffer(fakeValueBuffer.slice(1));
      fakeValueRef.current = fakeValueRef.current.slice(1);
      return;
    }
    if (!allowedCharactersRegex.test(e.key)) return;

    setFakeValueBuffer([Buffer.concat([fakeValueBuffer[0], Buffer.from(e.key)].filter(Boolean)), ...fakeValueBuffer]);
    fakeValueRef.current = `●${fakeValueRef.current}`;
  };

  const animateFakeInputChange = () => {
    fakeInputAnimationFrameRef.current = requestAnimationFrame(() => {
      if (!fakeInputRef.current) return;
      fakeInputRef.current.textContent = fakeValueRef.current;
      animateFakeInputChange();
    });
  };

  useLayoutEffect(() => {
    animateFakeInputChange();
    return () => {
      if (!fakeInputAnimationFrameRef.current) return;
      cancelAnimationFrame(fakeInputAnimationFrameRef.current);
    };
  });

  return (
    <>
      <span className={styles.fakePasswordInput} tabIndex={0} onKeyDownCapture={onFakePasswordInputKeyDown}>
        <span ref={fakeInputRef} className={styles.fakePasswordInputContent} />
      </span>
      <button
        onClick={() => {
          fakeValueRef.current = '';
          setFakeValueBuffer(initialValueBuffer);
          fakeInputRef.current.textContent = '';
        }}
      >
        submit
      </button>
      {/* <button*/}
      {/*  onClick={() => {*/}
      {/*    // eslint-disable-next-line no-alert*/}
      {/*    alert(String.fromCharCode(...fakeValueBuffer[0]));*/}
      {/*  }}*/}
      {/* >*/}
      {/*  show*/}
      {/* </button>*/}
    </>
  );
};
