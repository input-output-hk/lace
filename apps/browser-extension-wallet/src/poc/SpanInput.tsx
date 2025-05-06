import React, { useLayoutEffect, useRef, useState } from 'react';
import styles from './SpanInput.module.scss';

const allowedCharactersRegex = /^[\d!#$%&()*@L^\p{L}]$/u;

export const SpanInput = () => {
  const fakeValueRef = useRef('');
  const [fakeValueBuffer, setFakeValueBuffer] = useState([Buffer.from('', 'utf8')]);
  const fakeInputRef = useRef<HTMLSpanElement | null>(null);
  const fakeInputAnimationFrameRef = useRef<number | null>(null);

  const onFakePasswordInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Backspace') {
      if (fakeValueBuffer.length === 0) return;

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
      <span className={styles.fakePasswordInput} tabIndex={0} onKeyDown={onFakePasswordInputKeyDown}>
        <span ref={fakeInputRef} className={styles.fakePasswordInputContent} />
      </span>
      {/* eslint-disable-next-line no-alert */}
      <button onClick={() => alert(String.fromCharCode(...fakeValueBuffer[0]))}>show</button>
    </>
  );
};
