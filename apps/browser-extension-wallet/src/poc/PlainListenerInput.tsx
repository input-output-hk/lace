import React, { useEffect } from 'react';
import { allowedCharactersRegex } from '@src/poc/constants';

const keydownArea = 'key-down-area';
const initialValueBuffer = [Buffer.from('', 'utf8')];
let buffers = initialValueBuffer;

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

        if (event.key === 'Backspace') {
          if (buffers[0].length === 0) return;

          buffers = buffers.slice(1);
          keydownAreaNode.textContent = keydownAreaNode.textContent.slice(1);
          return;
        }
        if (!allowedCharactersRegex.test(event.key)) return;

        buffers = [Buffer.concat([buffers[0], Buffer.from(event.key)].filter(Boolean)), ...buffers];
        keydownAreaNode.textContent = `${keydownAreaNode.textContent}*`;
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
        style={{ display: 'inline-flex', width: 100, height: 40, border: '1px solid black', borderRadius: 4 }}
      />
      <button
        onClick={() => {
          buffers = initialValueBuffer;
          const keydownAreaNode = document.querySelector(`#${keydownArea}`);
          if (!keydownAreaNode) return;
          keydownAreaNode.textContent = '';
        }}
      >
        submit
      </button>
      {/* <button*/}
      {/*  onClick={() => {*/}
      {/*    // eslint-disable-next-line no-alert*/}
      {/*    alert(String.fromCharCode(...buffers[0]));*/}
      {/*  }}*/}
      {/* >*/}
      {/*  show*/}
      {/* </button>*/}
    </>
  );
};
