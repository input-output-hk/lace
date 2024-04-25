import { sx, style, vars } from '../../design-tokens';

export const root = style([
  sx({
    width: '$fill',
    borderRadius: '$medium',
    backgroundColor: '$educational_card_root_container_bgColor',
  }),
  {
    border: `${vars.spacing.$2} solid ${vars.colors.$educational_card_root_container_borderColor}`,
  },
]);
