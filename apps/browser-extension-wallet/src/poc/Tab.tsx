import React, { useLayoutEffect, useRef, useState } from 'react';
// import styles from './Tab.module.scss';

const allowedCharactersRegex = /^[\d!#$%&()*@L^\p{L}]$/u;

export const Tab = () => {
  const [passwordValue, setPasswordValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const fakeValueRef = useRef('');
  const [fakeValueBuffer, setFakeValueBuffer] = useState([Buffer.from('', 'utf8')]);
  const fakeInputRef = useRef<HTMLInputElement | null>(null);
  const fakeInputAnimationFrameRef = useRef<number | null>(null);

  const onFakePasswordInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
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
      <h4>password uncontrolled</h4>
      <input type={'password'} />
      <h4>password controlled</h4>
      <input type={'password'} value={passwordValue} onChange={(e) => setPasswordValue(e.currentTarget.value)} />
      <h4>text uncontrolled</h4>
      <input type={'text'} />
      <h4>text controlled</h4>
      <input type={'text'} value={textValue} onChange={(e) => setTextValue(e.currentTarget.value)} />
      <h4>fake (capturing keyboard event)</h4>
      <input ref={fakeInputRef} type={'text'} onKeyDownCapture={onFakePasswordInputKeyDown} />
      {/*<span className={styles.fakePasswordInput} tabIndex={0} onKeyDown={onFakePasswordInputKeyDown}>*/}
      {/*  <span ref={fakeInputRef} className={styles.fakePasswordInputContent} />*/}
      {/*</span>*/}
      {fakeValueBuffer.length > 0 && String.fromCharCode(...fakeValueBuffer[0])}
    </>
  );
};
