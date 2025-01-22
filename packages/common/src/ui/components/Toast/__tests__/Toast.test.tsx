import * as React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import { toast, ToastProps } from '../../Toast';
import '@testing-library/jest-dom';

const buttonTestId = 'action';
const unmountCb = () => toast.destroy();
const toastId = 'toast-content-wrapper';

const ToastContainer = ({ text, duration, withProgressBar }: ToastProps) => {
  React.useEffect(() => unmountCb, []);

  return (
    <button data-testid={buttonTestId} onClick={() => toast.notify({ text, duration, withProgressBar })}>
      Click me
    </button>
  );
};

describe('Testing TextContent component', () => {
  const duration = 10;
  const props: ToastProps = {
    text: 'test text',
    duration,
    withProgressBar: true
  };

  test('should display toast with text and progress bar', async () => {
    const { findByTestId } = render(<ToastContainer {...props} />);
    const button = await findByTestId(buttonTestId);

    expect(screen.queryAllByText(props.text)).toHaveLength(0);

    fireEvent.click(button);

    const toastEl = await findByTestId(toastId);
    expect(toastEl).toBeVisible();

    const message = await within(toastEl).findByText(props.text);
    const progressBar = await within(toastEl).findByTestId('progressbar-wrapper-id');

    expect(message).toBeVisible();
    expect(progressBar).toBeVisible();
  });

  test('should display toast without progressbar', async () => {
    const { findByTestId } = render(<ToastContainer {...props} withProgressBar={false} />);
    const button = await findByTestId(buttonTestId);

    fireEvent.click(button);

    const toastEl = await findByTestId(toastId);
    expect(toastEl).toBeVisible();

    expect(toastEl.querySelectorAll('.progressbar-wrapper')).toHaveLength(0);
  });

  test('should destroy toast on close click', async () => {
    const { findByTestId } = render(<ToastContainer {...props} withProgressBar={false} />);
    const button = await findByTestId(buttonTestId);

    fireEvent.click(button);

    const toastEl = await findByTestId(toastId);
    expect(toastEl).toBeVisible();

    const closeBtn = await findByTestId('toast-close-btn');
    expect(closeBtn).toBeVisible();

    fireEvent.click(closeBtn);

    expect(screen.queryAllByText(props.text)).toHaveLength(0);
  });

  test('should destroy toast after time passes', async () => {
    const { findByTestId } = render(<ToastContainer {...props} withProgressBar={false} />);
    const button = await findByTestId(buttonTestId);

    fireEvent.click(button);

    const toastEl = await findByTestId(toastId);
    expect(toastEl).toBeVisible();

    setTimeout(() => {
      expect(screen.queryAllByText(props.text)).toHaveLength(0);
    }, duration + 1);
  });
});
