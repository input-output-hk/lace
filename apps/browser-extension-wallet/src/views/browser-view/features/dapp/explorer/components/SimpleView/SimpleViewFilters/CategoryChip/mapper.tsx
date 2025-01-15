import * as React from 'react';
import Development from './assets/development.component.svg';
import Education from './assets/education.component.svg';
import Games from './assets/game.component.svg';
import Identity from './assets/identity.component.svg';
import Marketplace from './assets/marketplace.component.svg';
import Collectibles from './assets/collectibles.component.svg';
import Other from './assets/other.component.svg';
import Security from './assets/security.component.svg';
import ShowAll from './assets/all.component.svg';
import Defi from './assets/defi.component.svg';
import { Categories } from './categories.enum';
import Icon from '@ant-design/icons';

export const mapCategory = (category: string): React.ReactNode => {
  const _category = category.toUpperCase();

  const icon = (() => {
    switch (_category) {
      case Categories.Defi:
        return Defi;
      case Categories.Development:
        return Development;
      case Categories.Education:
        return Education;
      case Categories.Games:
        return Games;
      case Categories.Identity:
        return Identity;
      case Categories.Marketplace:
        return Marketplace;
      case Categories.Collectibles:
        return Collectibles;
      case Categories.Other:
        return Other;
      case Categories.Security:
        return Security;
      case Categories.All:
        return ShowAll;
      default:
        // eslint-disable-next-line unicorn/no-null
        return null;
    }
  })();

  return icon && <Icon component={icon} />;
};
