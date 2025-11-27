import { mixins } from '../index';

describe('mixins', () => {
  it('should set background', () => {
    const background = mixins.setBackground('red');
    expect(background).toEqual({ backgroundColor: 'red' });
  });

  it('should set toRem', () => {
    // eslint-disable-next-line no-magic-numbers
    const toRem = mixins.toRem(20);
    expect(toRem).toEqual('1.25rem');
  });

  it('should set color', () => {
    const color = mixins.setColor('primary');
    expect(color).toEqual({ color: '#000428 !important' });
  });

  it('should set spacer', () => {
    // eslint-disable-next-line no-magic-numbers
    const spacer = mixins.setSpacer(20);
    expect(spacer).toContain('margin-top: 1.25rem;');
  });

  it('should set spacer with no space', () => {
    const spacer = mixins.setSpacer(0);
    expect(spacer).toEqual('');
  });

  it('should set margins with styled object', () => {
    // eslint-disable-next-line no-magic-numbers
    const margins = mixins.setMargin([20], true);
    expect(margins).toEqual({ margin: '1.25rem' });
  });

  it('should set margins without styled object', () => {
    // eslint-disable-next-line no-magic-numbers
    const margins = mixins.setMargin([20], false);
    expect(margins).toContain('margin: 1.25rem');
  });

  it('should set margins without styled object nor rules', () => {
    const margins = mixins.setMargin([], false);
    expect(margins).toContain('');
  });

  it('should set paddings with styled object', () => {
    // eslint-disable-next-line no-magic-numbers
    const paddings = mixins.setPadding([20], true);
    expect(paddings).toEqual({ padding: '1.25rem' });
  });

  it('should set paddings without styled object', () => {
    // eslint-disable-next-line no-magic-numbers
    const paddings = mixins.setPadding([20], false);
    expect(paddings).toContain('padding: 1.25rem');
  });
});
