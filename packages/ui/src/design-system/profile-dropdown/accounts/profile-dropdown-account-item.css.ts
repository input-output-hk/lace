import { sx, style } from '../../../design-tokens';

export const root = style({
  width: '100%',
  minWidth: '227px',
});

export const accountLabel = sx({
  color: '$text_secondary',
});

export const derivationPath = style([
  {
    lineHeight: '1',
  },
  sx({
    color: '$text_primary',
  }),
]);

export const editIcon = sx({
  color: '$profile_dropdown_account_item_edit_icon_color',
});

export const deleteIcon = sx({
  color: '$profile_dropdown_account_item_delete_icon_color',
});
