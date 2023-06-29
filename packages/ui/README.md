# Lace UI toolkit

## Getting Started

First, install the dependencies:

```bash
yarn install --frozen-lockfile
```

## Storybook

Storybook is used for development

```bash
yarn storybook
```

### Stories format

| Type         |                                  PURPOSE                                  |
| ------------ | :-----------------------------------------------------------------------: |
| Overview     |          Dumb components presented as 1:1 parity from Figma file          |
| Interactions |            Used for testing and to simulate user interactions             |
| Controls     | Interact with a component's arguments dynamically without needing to code |

### Docs

Make sure to export `components` and `subcomponents` so they are displayed in the `Docs` tab.

```jsx
export default {
  title: 'List & tables/Assets table',
  component: AssetsTable,
  subcomponents: {
    TokenProfile,
    TokenAmount,
    MarketPrice,
  }
} as Meta;
```

## File naming convention

| FILES            |                                    PURPOSE                                     |
| ---------------- | :----------------------------------------------------------------------------: |
| \*.index.ts      |             Defines the public API to be imported by other modules             |
| \*.component.tsx |                            Defines the UI component                            |
| \*.css.ts        |                           Vanilla-extract CSS files                            |
| \*.stories.ts    |                                Storybook files                                 |
| \*.data.ts       | Defines the data/types representation of the UI component or application logic |
| \*.context.ts    |    Defines the UI component's inner state to be consumed by nested children    |
| \*.hooks.ts      |                Defines methods to manipulate the context state                 |
