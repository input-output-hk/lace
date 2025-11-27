/* eslint-disable no-magic-numbers */
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { InlineInfoList } from '../InlineInfoList';

describe('InlineInfoList', () => {
  test('displays items on the list with the first letter of the name in upper case', () => {
    const { queryAllByTestId } = render(
      <InlineInfoList
        items={[
          { name: 'ALLCAPS', value: 'val1' },
          { name: 'lowercase', value: 'val2' },
          { name: 'camelCase', value: 'val3' }
        ]}
      />
    );

    const keys = queryAllByTestId('info-list-item-key');
    const values = queryAllByTestId('info-list-item-value');
    expect(keys).toHaveLength(3);
    expect(values).toHaveLength(3);
    expect(keys[0]).toHaveTextContent('ALLCAPS');
    expect(keys[1]).toHaveTextContent('Lowercase');
    expect(keys[2]).toHaveTextContent('CamelCase');
    expect(values[0]).toHaveTextContent('val1');
    expect(values[1]).toHaveTextContent('val2');
    expect(values[2]).toHaveTextContent('val3');
  });
});
