/* eslint-disable no-magic-numbers */
import { Language } from '@lace/common';
import { renderHook } from '@testing-library/react-hooks';
import { i18n } from 'i18next';
import { expect, vi } from 'vitest';
import { changeLanguage, getI18n } from '../../i18n';
import { useI18n } from './useI18n';

vi.mock('../../i18n', () => ({
  changeLanguage: vi.fn(),
  getI18n: vi.fn(),
}));

describe('useI18n hook', () => {
  it('does not change the language if it is not provided', () => {
    const i18nInstance = {
      language: 'en',
    } as i18n;
    vi.mocked(getI18n).mockReturnValue(i18nInstance);
    renderHook(() => useI18n());
    expect(changeLanguage).not.toHaveBeenCalled();
  });

  it('changes the language only if it is different from the current language', () => {
    const i18nInstance = {
      language: 'en',
    } as i18n;
    vi.mocked(getI18n).mockReturnValue(i18nInstance);

    renderHook(() => useI18n(Language.en));
    expect(changeLanguage).not.toHaveBeenCalled();

    renderHook(() => useI18n('pl' as Language));
    expect(changeLanguage).toHaveBeenNthCalledWith(1, 'pl' as Language);
  });

  it('returns loading property indicating the language change is in pogress', async () => {
    const i18nInstance = {
      language: 'en',
    } as i18n;
    vi.mocked(getI18n).mockReturnValue(i18nInstance);

    // eslint-disable-next-line unicorn/consistent-function-scoping, @typescript-eslint/no-empty-function
    let resolveChangeLanguagePromise = () => {};
    vi.mocked(changeLanguage).mockReturnValue(
      new Promise((resolve) => {
        resolveChangeLanguagePromise = resolve;
      })
    );

    const run1 = renderHook(() => useI18n());
    expect(run1.result.current.loading).toEqual(false);

    const run2 = renderHook(() => useI18n('pl' as Language));
    expect(run2.result.current.loading).toEqual(true);

    resolveChangeLanguagePromise();
    await run2.waitForNextUpdate();
    expect(run2.result.current.loading).toEqual(false);
  });
});
