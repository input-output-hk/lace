import React, { useEffect } from 'react';
import { allowedCharactersRegex } from '@src/poc/constants';

const keydownArea = 'key-down-area';

let buffers = [Buffer.from('', 'utf8')];

export const PlainListenerInput = () => {
  useEffect(() => {
    const { abort, signal } = new AbortController();
    const keydownAreaNode = document.querySelector(`#${keydownArea}`);
    if (!keydownAreaNode) return () => void 0;

    keydownAreaNode.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!allowedCharactersRegex.test(event.key)) return;

        buffers = [Buffer.concat([buffers[0], Buffer.from(event.key)].filter(Boolean)), ...buffers];
      },
      { signal }
    );
    return () => {
      abort();
    };
  }, []);

  return (
    <>
      <div
        tabIndex={0}
        id={keydownArea}
        style={{ width: 100, height: 40, border: '1px solid black', borderRadius: 4 }}
      />
      {/* eslint-disable-next-line no-alert */}
      <button onClick={() => alert(String.fromCharCode(...buffers[0]))}>show</button>
    </>
  );
};
