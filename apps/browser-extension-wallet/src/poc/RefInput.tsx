import React, { useLayoutEffect, useRef, useState } from 'react';

const allowedCharactersRegex = /^[\d!#$%&()*@L^\p{L}]$/u;

export const RefInput = () => {
  const fakeValueRef = useRef('');
  const [fakeValueBuffer, setFakeValueBuffer] = useState([Buffer.from('', 'utf8')]);
  const fakeInputRef = useRef<HTMLTextAreaElement | null>(null);
  const fakeInputAnimationFrameRef = useRef<number | null>(null);

  const onFakePasswordInputKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    e.preventDefault();

    if (e.key === 'Backspace') {
      if (fakeValueBuffer.length === 0) return;

      setFakeValueBuffer(fakeValueBuffer.slice(1));
      fakeValueRef.current = fakeValueRef.current.slice(1);
      return;
    }
    if (!allowedCharactersRegex.test(e.key)) return;

    setFakeValueBuffer([Buffer.concat([fakeValueBuffer[0], Buffer.from(e.key)].filter(Boolean)), ...fakeValueBuffer]);
    fakeValueRef.current = `${fakeValueRef.current}•`;
  };

  const animateFakeInputChange = () => {
    fakeInputAnimationFrameRef.current = requestAnimationFrame(() => {
      if (!fakeInputRef.current) return;
      fakeInputRef.current.value = fakeValueRef.current;
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
      <div style={{ height: 24, display: 'inline-block' }}>
        <textarea
          style={{ whiteSpace: 'nowrap', height: 'calc(100% + 25px)' }}
          rows={1}
          ref={fakeInputRef}
          onKeyDownCapture={onFakePasswordInputKeyDown}
        />
      </div>
      {/* eslint-disable-next-line no-alert */}
      <button onClick={() => alert(String.fromCharCode(...fakeValueBuffer[0]))}>show</button>
    </>
  );
};
