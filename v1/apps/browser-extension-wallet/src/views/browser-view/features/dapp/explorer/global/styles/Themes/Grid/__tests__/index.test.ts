import { grid } from '../index';

describe('grid', () => {
  it('should set display to flex', () => {
    const display = grid.setDisplay({ flex: true });
    expect(display).toEqual('flex');
  });

  it('should set display to grid', () => {
    const display = grid.setDisplay({ grid: true });
    expect(display).toEqual('grid');
  });

  it('should default display to block', () => {
    const display = grid.setDisplay({});
    expect(display).toEqual('block');
  });
});
