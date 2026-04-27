# ui-toolkit

This library was generated with [Nx](https://nx.dev).

## Atomic Design

See [docs/atomic-design.md](../../../docs/atomic-design.md).

## HugeIcons

#### HugeIcons Pro (licensed icon library)

1.  Request the HugeIcons license token through Slack.
2.  In the same `~/.npmrc` file add the following:

```
//npm.hugeicons.com/:_authToken=HUGEICONS_TOKEN
```

3. Replace `HUGEICONS_TOKEN` with the actual token

#### HugeIcons Implementation

1. Search for the icon name in the [Figma icons directory](https://www.figma.com/design/1JgLNRj71509LNX4St4Yzm/Lace-UI-Toolkit--v2-?node-id=29-78&p=f&m=dev) or in [Hugeicons library](https://hugeicons.com/icons).

2. Add the new icon in the `IconMap.ts` file:
   - Import the new icon stroke variant from `@hugeicons-pro/core-stroke-rounded` and from `@hugeicons-pro/core-solid-rounded` if applicable. Create the new icon variant within `iconMap` giving it an accurate name.

You can now use it importing `Icon` from `@lace-lib/ui-toolkit`. E.g.:

`<Icon name="Plus" size={20}`

This Icon component can also be used to render custom SVG icons we add manually. In order to do so, import the SVG icon component in customIcons.tsx and add it to the CustomIcons object with the name you want to use for it.

#### Accepted props

```
name: HugeIconName;
variant?: 'solid' | 'stroke'; (defaults to "stroke")
color?: string; (defaults to "theme.icons.background" which is the same as in "theme.text.primary")
size?: number; (default = 24)
```
