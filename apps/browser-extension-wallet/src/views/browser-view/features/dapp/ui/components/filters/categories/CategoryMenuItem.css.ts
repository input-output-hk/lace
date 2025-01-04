import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@input-output-hk/lace-ui-toolkit';

export enum States {
  Default = 'Default',
  Selected = 'Selected'
}

export const container = recipe({
  base: {
    borderWidth: vars.spacing.$2,
    borderRadius: vars.radius.$full,
    padding: `${vars.spacing.$16} ${vars.spacing.$32}`
  },
  variants: {
    state: {
      [States.Default]: {
        backgroundColor: vars.colors.$card_greyed_backgroundColor,
        selectors: {
          '&:hover': {
            backgroundColor: vars.colors.$card_outlined_borderColor,
            cursor: 'pointer'
          }
        }
      },
      [States.Selected]: {
        backgroundColor: vars.colors.$card_outlined_borderColor
      }
    }
  },
  defaultVariants: {
    state: States.Default
  }
});
