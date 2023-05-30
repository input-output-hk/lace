import { sx, style, vars } from '../../design-tokens';

export const root = style([
  sx({
    width: '$fill',
  }),
  {
    borderBottom: `1px solid ${vars.colors.$sub_navigation_container_borderColor}`,
  },
]);
