import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  test('displays loading icon if loading is true', () => {
    const { queryByRole, container } = render(<Button loading>Test Button</Button>);
    const loadingIcon = queryByRole('img');
    expect(loadingIcon).toBeInTheDocument();
    expect(container).toHaveTextContent('Test Button');
  });

  test('displays custom icon instead of children', () => {
    const { queryByTestId, container } = render(<Button icon={<svg data-testid="custom-icon" />}>Test Button</Button>);
    const customIcon = queryByTestId('custom-icon');
    expect(customIcon).toBeInTheDocument();
    expect(container).not.toHaveTextContent('Test Button');
  });
});
