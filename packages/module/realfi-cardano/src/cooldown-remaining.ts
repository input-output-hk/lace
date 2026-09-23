import type { TranslationKey } from '@lace-contract/i18n';

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_HOUR = 60;

/**
 * Localized time remaining, e.g. "2d 3h" / "5h 12m" / "8m" / "soon". Shared by
 * the staking-detail cooldown banner and the Manage sheet's Cooldown Period
 * row so both count the same boundary down the same way.
 */
export const formatCooldownRemaining = (
  ms: number,
  t: (key: TranslationKey, options?: Record<string, number>) => string,
): string => {
  if (ms <= 0) return t('realfi.detail.cooldown-remaining.soon');
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (days > 0)
    return t('realfi.detail.cooldown-remaining.days-hours', { days, hours });
  if (hours > 0)
    return t('realfi.detail.cooldown-remaining.hours-minutes', {
      hours,
      minutes,
    });
  return t('realfi.detail.cooldown-remaining.minutes', { minutes });
};
