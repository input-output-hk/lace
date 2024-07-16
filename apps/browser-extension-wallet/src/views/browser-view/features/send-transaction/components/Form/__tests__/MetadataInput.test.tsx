import React from 'react';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MetadataInput } from '../MetadataInput';
import { i18n } from '@lace/translation';
import { I18nextProvider } from 'react-i18next';

const WrappedMetadataInput = () => (
  <I18nextProvider i18n={i18n}>
    <MetadataInput />
  </I18nextProvider>
);

describe('MetadataInput', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });
  describe('renders', () => {
    test('suffix that is not hidden behind the input content', async () => {
      render(<WrappedMetadataInput />);
      const input = screen.queryByTestId('metadata-input') as HTMLInputElement;

      fireEvent.change(input, {
        target: { value: 'asdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasd' }
      });

      await waitFor(() => {
        expect(screen.queryByTestId('metadata-input-suffix')).toBeVisible();
      });
    });
  });
});
