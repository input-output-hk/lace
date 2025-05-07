import React, { useState } from 'react';

export const ControlledInput = () => {
  const [fakeValue, setFakeValue] = useState('');
  const [fakeValueBuffer, setFakeValueBuffer] = useState([Buffer.from('', 'utf8')]);

  const onFakePasswordInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.currentTarget.value.length < fakeValue.length) {
      setFakeValueBuffer(fakeValueBuffer.slice(1));
      setFakeValue(fakeValue.slice(1));
      return;
    }

    setFakeValueBuffer([
      Buffer.concat([fakeValueBuffer[0], Buffer.from(e.currentTarget.value.slice(-1))].filter(Boolean)),
      ...fakeValueBuffer
    ]);
    setFakeValue(`${fakeValue}•`);
  };

  return (
    <>
      <input type={'text'} value={fakeValue} onChangeCapture={onFakePasswordInputChange} />
      {/* eslint-disable-next-line no-alert */}
      <button onClick={() => alert(String.fromCharCode(...fakeValueBuffer[0]))}>show</button>
    </>
  );
};
