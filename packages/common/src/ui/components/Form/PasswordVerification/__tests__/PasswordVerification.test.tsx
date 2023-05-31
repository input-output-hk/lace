/* eslint-disable no-magic-numbers */
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { PasswordVerification } from '../PasswordVerification';

describe('PasswordVerification', () => {
  test('displays all active and inactive complexity bars', () => {
    const { queryAllByTestId } = render(
      <PasswordVerification
        value="admin123"
        complexityBarList={[{ isActive: true }, { isActive: true }, { isActive: false }]}
      />
    );
    expect(queryAllByTestId('bar-level-active')).toHaveLength(2);
    expect(queryAllByTestId('bar-level-inactive')).toHaveLength(1);
  });
  test('displays feedback for user', () => {
    const { queryByTestId } = render(
      <PasswordVerification
        value="admin123"
        complexityBarList={[{ isActive: false }]}
        feedbacks={['Some feedback', 'Another tip']}
      />
    );
    const feedbackDiv = queryByTestId('password-feedback');
    expect(feedbackDiv.childElementCount).toBe(2);
    expect(feedbackDiv).toHaveTextContent('Some feedback');
    expect(feedbackDiv).toHaveTextContent('Another tip');
  });
});
