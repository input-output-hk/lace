/* eslint-disable no-magic-numbers */
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { PasswordVerification } from '../PasswordVerification';
import { OnPasswordChange } from '@input-output-hk/lace-ui-toolkit';

const onChange: OnPasswordChange = () => void 0;

describe('PasswordVerification', () => {
  test('displays all active and inactive complexity bars', () => {
    const { queryAllByTestId, queryByTestId } = render(
      <PasswordVerification
        onChange={onChange}
        hasValue
        complexityBarList={[{ isActive: true }, { isActive: true }, { isActive: false }]}
      />
    );
    (queryByTestId('password-input') as HTMLInputElement).value = 'admin123';
    expect(queryAllByTestId('bar-level-active')).toHaveLength(2);
    expect(queryAllByTestId('bar-level-inactive')).toHaveLength(1);
  });
  test('displays feedback for user', () => {
    const { queryByTestId } = render(
      <PasswordVerification
        hasValue
        onChange={onChange}
        complexityBarList={[{ isActive: false }]}
        feedbacks={['Some feedback', 'Another tip']}
      />
    );
    (queryByTestId('password-input') as HTMLInputElement).value = 'admin123';
    const feedbackDiv = queryByTestId('password-feedback');
    expect(feedbackDiv.childElementCount).toBe(2);
    expect(feedbackDiv).toHaveTextContent('Some feedback');
    expect(feedbackDiv).toHaveTextContent('Another tip');
  });
});
