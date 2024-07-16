### Working with UI Toolkit on an app level

To setup linking for local development between **UI Toolkit** and **Lace** or any other app, you need to link **UI Toolkit** with it on an app level. To achieve this follow steps listed below.

> [!IMPORTANT]
> [yalc](https://github.com/wclr/yalc) is a prerequisite for this setup to work. Install it using `yarn global add yalc`

#### UI Toolkit repository

1. Clone code repository
```
git clone git@github.com:input-output-hk/lace-ui-toolkit.git
```

2. Follow steps described in UI Toolkit's [README.md](https://github.com/input-output-hk/lace-ui-toolkit?tab=readme-ov-file#link-lace-ui-toolkit-for-local-development--testing)

#### Lace repository
1. Go to app directory ex. `apps/browser-extension-wallet` and setup linking
```
yalc link @input-output-hk/lace-ui-toolkit
```
2. Start dev mode 
```
yarn dev
```
3. Once development done remove linking
```
yalc remove @input-output-hk/lace-ui-toolkit
```
