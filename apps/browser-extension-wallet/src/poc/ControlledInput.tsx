import React, { useState } from 'react';

const initialValueBuffer = [Buffer.from('', 'utf8')];

export const ControlledInput = () => {
  const [fakeValue, setFakeValue] = useState('');
  const [fakeValueBuffer, setFakeValueBuffer] = useState(initialValueBuffer);
  const [capturePassword, setCapturePassword] = useState(false);

  const onFakePasswordInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.currentTarget.value.length < fakeValue.length) {
      if (capturePassword) {
        setFakeValueBuffer(fakeValueBuffer.slice(1));
      }
      setFakeValue(fakeValue.slice(1));
      return;
    }

    if (capturePassword) {
      setFakeValueBuffer([
        Buffer.concat([fakeValueBuffer[0], Buffer.from(e.currentTarget.value.slice(-1))].filter(Boolean)),
        ...fakeValueBuffer
      ]);
    }
    setFakeValue(`${fakeValue}•`);
  };

  return (
    <>
      <div>
        <input
          id={'controlledinput'}
          type={'checkbox'}
          checked={capturePassword}
          onChange={() => setCapturePassword(!capturePassword)}
        />
        <label htmlFor={'controlledinput'}>capture password</label>
      </div>
      <input type={'text'} value={fakeValue} onChangeCapture={onFakePasswordInputChange} />
      <button
        onClick={() => {
          setFakeValue('');
          setFakeValueBuffer(initialValueBuffer);
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
