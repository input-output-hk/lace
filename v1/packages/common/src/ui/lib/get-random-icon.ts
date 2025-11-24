import { toSvg, JdenticonConfig } from 'jdenticon';

export const getRandomIcon = (iconConfig: { id: string; size: number; jdenticonConfig?: JdenticonConfig }): string => {
  const icon = toSvg(iconConfig.id, iconConfig.size, iconConfig.jdenticonConfig);
  return `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
};
