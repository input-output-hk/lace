import { PIE_CHART_DEFAULT_COLOR_SET } from '@input-output-hk/lace-ui-toolkit';

export const PoolIndicator = ({ color = PIE_CHART_DEFAULT_COLOR_SET[0] }: { color?: string }) => (
  <svg width="4" height="41" viewBox="0 0 4 41" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="0.5" width="40" height="4" rx="2" transform="rotate(90 4 0.5)" fill={color} />
  </svg>
);
