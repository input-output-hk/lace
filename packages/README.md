### Working with UI Toolkit on a package level

To setup linking for local development in Storybook for packages like **Core**, **Staking** or any other package, you need to link **UI Toolkit** with it on a package level. To achieve this follow steps listed below.

> [!IMPORTANT]
> [yalc](https://github.com/wclr/yalc) is a prerequisite for this setup to work. Install it using `yarn global add yalc`

#### UI Toolkit repository

1. Clone code repository
```
git clone git@github.com:input-output-hk/lace-ui-toolkit.git
```

2. Follow steps described in UI Toolkit's [README.md](https://github.com/input-output-hk/lace-ui-toolkit?tab=readme-ov-file#link-lace-ui-toolkit-for-local-development--testing)

#### Lace repository

1. Go to package directory ex. `packages/core` and setup linking
```
yalc link @input-output-hk/lace-ui-toolkit
```
2. Start dev mode (Storybook)
```
yarn dev
```
3. Once development done remove linking
```
yalc remove @input-output-hk/lace-ui-toolkit
```
