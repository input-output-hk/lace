import { sprinklesConfig } from '@lace/ui';
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles';
import { theme } from './theme.css';

const colorProperties = defineProperties({
  properties: {
    background: theme.colors,
    backgroundColor: theme.colors,
    backgroundImage: theme.colors,
    borderBottomColor: theme.colors,
    borderColor: theme.colors,
    borderImageSource: theme.colors,
    borderLeftColor: theme.colors,
    borderRightColor: theme.colors,
    borderTopColor: theme.colors,
    color: theme.colors,
  },
});

export const sx = createSprinkles(colorProperties, ...sprinklesConfig);

export type Sx = Parameters<typeof sx>[0];
