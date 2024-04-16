import React from 'react';

import type { Meta } from '@storybook/react';

import cardanoImage from '../../assets/images/cardano-blue-bg.png';
import DarkFallBack from '../../assets/images/dark-mode-fallback.png';
import LightFallBack from '../../assets/images/light-mode-fallback.png';
import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { useThemeVariant } from '../../design-tokens/theme/hooks/use-theme-variant';
import { page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Grid, Cell } from '../grid';

import { Image } from './image.component';
import { Initials } from './initials.component';
import { UserProfile } from './user-profile.component';

const subtitle = `The profile picture control displays the avatar image for a person, if one
is available; if not, it displays the person's initials or a generic glyph.`;

export default {
  title: 'Basic input/Profile picture',
  component: UserProfile,
  subcomponents: {
    Image,
    Initials,
  },
  decorators: [page({ title: 'Profile picture', subtitle })],
} as Meta;

const Images = (): JSX.Element => {
  const { theme } = useThemeVariant();
  const fallbackImage =
    theme === ThemeColorScheme.Dark ? DarkFallBack : LightFallBack;

  return (
    <>
      <Variants.Row>
        <Variants.Cell>
          <UserProfile imageSrc="" fallbackText="L" delayMs={0} />
        </Variants.Cell>
      </Variants.Row>
      <Variants.Row>
        <Variants.Cell>
          <UserProfile
            imageSrc=""
            delayMs={0}
            fallbackText="FallbackImage has priority over fallbackText"
            fallbackImage={fallbackImage}
          />
        </Variants.Cell>
      </Variants.Row>
      <Variants.Row>
        <Variants.Cell>
          <Initials letter="M" />
        </Variants.Cell>
      </Variants.Row>
      <Variants.Row>
        <Variants.Cell>
          <Image imageSrc={cardanoImage} />
        </Variants.Cell>
      </Variants.Row>
    </>
  );
};

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Components">
        <Variants.Table headers={['User profile', 'Initials', 'Image']}>
          <Variants.Row>
            <Variants.Cell>
              <UserProfile imageSrc="" fallbackText="L" delayMs={0} />
            </Variants.Cell>
            <Variants.Cell>
              <Initials letter="M" />
            </Variants.Cell>
            <Variants.Cell>
              <Image imageSrc={cardanoImage} />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Divider my="$64" />
      </Section>
      <Section title="Variants">
        <Variants.Table
          headers={[
            'User profile — initials (default if no uploaded picture)',
            'User profile — Avatar',
            'User profile — Rounded',
          ]}
        >
          <Variants.Row>
            <Variants.Cell>
              <UserProfile imageSrc="" fallbackText="L" />
            </Variants.Cell>
            <Variants.Cell>
              <UserProfile
                imageSrc="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?&w=128&h=128&dpr=2&q=80"
                fallbackText="L"
              />
            </Variants.Cell>
            <Variants.Cell>
              <UserProfile
                imageSrc="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?&w=128&h=128&dpr=2&q=80"
                fallbackText="L"
                radius="rounded"
              />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Variants.Table headers={['Initials — circle', 'Initials — Rounded']}>
          <Variants.Row>
            <Variants.Cell>
              <Initials letter="M" />
            </Variants.Cell>
            <Variants.Cell>
              <Initials letter="M" radius="rounded" />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Variants.Table
          headers={[
            'Image — browser view (default)',
            'Image — browser view (selected)',
            'Image — pop-up view (default)',
            'Image — pop-up view (selected)',
          ]}
        >
          <Variants.Row>
            <Variants.Cell>
              <Image imageSrc={cardanoImage} />
            </Variants.Cell>
            <Variants.Cell>
              <Image imageSrc={cardanoImage} selected />
            </Variants.Cell>
            <Variants.Cell data-view-mode="popup" id="test">
              <Image imageSrc={cardanoImage} />
            </Variants.Cell>
            <Variants.Cell data-view-mode="popup">
              <Image imageSrc={cardanoImage} selected />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Divider my="$64" />
      </Section>
      <Section title="Main components">
        <Variants.Table headers={['Default']}>
          <Images />
        </Variants.Table>

        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <Images />
          </Variants.Table>
        </LocalThemeProvider>
      </Section>
    </Cell>
  </Grid>
);
