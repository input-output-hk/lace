# ui-toolkit

This library was generated with [Nx](https://nx.dev).

## Atomic Design

See [docs/atomic-design.md](../../../docs/atomic-design.md).

## HugeIcons

#### HugeIcons Implementation

1. Search for the icon name in the [Figma icons directory](https://www.figma.com/design/1JgLNRj71509LNX4St4Yzm/Lace-UI-Toolkit--v2-?node-id=29-78&p=f&m=dev) or in [Hugeicons library](https://hugeicons.com/icons).

2. Add the new icon in the `IconMap.ts` file:
   - Import the icon from `@hugeicons/core-free-icons/<IconName>Icon` — a **default** import per icon. Do NOT use a named import from the pack barrel (`from '@hugeicons/core-free-icons'`): the barrel re-exports all ~6,000 icon modules and Metro does not tree-shake, so a single barrel import bundles every icon. Add it to `iconMap` under an accurate name.

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
