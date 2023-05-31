import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { DrawerHeader } from '../DrawerHeader';

describe('DrawerHeader', () => {
  test('displays title and subtitle', () => {
    const { queryByTestId } = render(<DrawerHeader title="Drawer Title" subtitle="Subtitle" />);
    expect(queryByTestId('drawer-header-title')).toHaveTextContent('Drawer Title');
    expect(queryByTestId('drawer-header-subtitle')).toHaveTextContent('Subtitle');
  });
});
