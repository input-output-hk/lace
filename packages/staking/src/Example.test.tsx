import { render } from '@testing-library/react';
import { Example } from './Example';

describe('test prop', () => {
  it('renders proper text when true', () => {
    const { container } = render(<Example test />);

    expect(container.textContent).toMatchInlineSnapshot('"This is an example component! true"');
  });

  it('renders proper text when false (default)', () => {
    const { container } = render(<Example />);

    expect(container.textContent).toMatchInlineSnapshot('"This is an example component! false"');
  });
});
