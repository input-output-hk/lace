import * as React from 'react';
import Development from './assets/development.svg';
import Education from './assets/education.svg';
import Games from './assets/game.svg';
import Identity from './assets/identity.svg';
import Marketplace from './assets/marketplace.svg';
import Nft from './assets/nft.svg';
import Other from './assets/other.svg';
import Security from './assets/security.svg';
import ShowAll from './assets/all.svg';
import Defi from './assets/defi.svg';
import { Categories } from './categories.enum';

export const mapCategory: React.FC<any> = (category: string) => {
  const _category = category.toUpperCase();

  switch (_category) {
    case Categories.Defi:
      return <Defi />;
    case Categories.Development:
      return <Development />;
    case Categories.Education:
      return <Education />;
    case Categories.Games:
      return <Games />;
    case Categories.Identity:
      return <Identity />;
    case Categories.Marketplace:
      return <Marketplace />;
    case Categories.Nft:
      return <Nft />;
    case Categories.Other:
      return <Other />;
    case Categories.Security:
      return <Security />;
    case Categories.All:
      return <ShowAll />;
    default:
      return <></>;
  }
};
