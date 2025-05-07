import React, { useState } from 'react';
import { SpanInput } from '@src/poc/SpanInput';
import { ControlledInput } from '@src/poc/ControlledInput';
import { PlainListenerInput } from '@src/poc/PlainListenerInput';
import { addPlainJsInput } from '@src/poc/plain-js-input';

addPlainJsInput();

export const Inputs = () => {
  const [passwordValue, setPasswordValue] = useState('');
  const [textValue, setTextValue] = useState('');

  return (
    <>
      <h4 style={{ margin: '10px 0 0' }}>password uncontrolled</h4>
      <input type={'password'} />
      <h4 style={{ margin: '10px 0 0' }}>password controlled</h4>
      <input type={'password'} value={passwordValue} onChange={(e) => setPasswordValue(e.currentTarget.value)} />
      <h4 style={{ margin: '10px 0 0' }}>text uncontrolled</h4>
      <input type={'text'} />
      <h4 style={{ margin: '10px 0 0' }}>text controlled</h4>
      <input type={'text'} value={textValue} onChange={(e) => setTextValue(e.currentTarget.value)} />
      <h4 style={{ margin: '10px 0 0' }}>fake - capturing keyboard event + span</h4>
      <SpanInput />
      <h4 style={{ margin: '10px 0 0' }}>fake - capturing value change + input</h4>
      <ControlledInput />
      <h4 style={{ margin: '10px 0 0' }}>fake - plain js capturing value change + react input</h4>
      <PlainListenerInput />
    </>
  );
};
