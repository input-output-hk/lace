/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextAvatar } from '../TextAvatar';

describe('Testing TextAvatar component', () => {
  test('should render component and the children properly', async () => {
    const { findByTestId } = render(<TextAvatar>A</TextAvatar>);
    const avatar = await findByTestId('text-avatar');

    expect(avatar).toBeVisible();
    expect(avatar).toHaveTextContent('A');
  });
});
