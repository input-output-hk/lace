# Light Wallet | Apps | Browser Extension

A fully capable wallet packaged as browser extensions for Chrome, Firefox, Edge, and Safari. The
app imports all UI and wallet functionality from the [core] and [cardano] packages.

[core]: ../../packages/core
[cardano]: ../../packages/cardano

## Building and Running

### Configuration

Default values that are to be stored in repository are provided in `.env.defaults` file.

The webpack plugin that is used to collect settings is configured
to ensure that all settings defined in example file are defined
in the files `.env.defaults`, `.env` or as environment variables

### Development

```sh
yarn dev
```

### Production build

```sh
yarn build
```

#### Chrome

- Open the Extensions settings (Wrench button > Tools > Extensions or navigate to chrome://extensions.
- On the Extensions settings tab, click the "Developer Mode" checkbox.
- Click the now-visible "Load unpacked extension..." button and select the `apps/browser-extension-wallet/dist` folder

#### Firefox

- Navigate to about:debugging#addons.
- On the Add-ons tab, click the "Enable add-on debugging" checkbox.
- Click "Load Temporary Add-on" button and select the `manifest.json` under `apps/browser-extension-wallet/dist` folder

#### Safari

Prerequisites:

- XCode command line tools and XCode (install cli tools first / use 'sudo xcode-select --reset' so correct path is set).
- Safari with enabled Develop menu (`Safari>Settings>Advanced>Show develop menu in menu bar`) and allowed unsigned
  extensions (`Develop>Allow Unsigned Extensions`).

Steps:

- Build Lace with `yarn build` in the main directory.
- Open `/packages/e2e-tests/` directory in your terminal
- Run `yarn safari:build`.
- Open Safari and make sure **Unsigned Extensions** are allowed (it turns off each Safari exit).
- Run `yarn safari:open`.
- Click `Quit and Open Safari Settings...`.
- Enable Lace with the tick next to extension's name.

### Testing

#### Wallaby.js (Optional) Streamline your testing XP

<https://wallabyjs.com/>

Wallaby.js is an IDE plugin that streamlines Test Driven Develompent by giving realtime testing feedback
within the IDE right where you write your code. This way you don't have to re-run test cases all the time
(and wait for the result) but Wallaby.js figures what changes you made, which test cases could be affected
and re-runs only these in realtime + giving you extra capabilities to debug and log values right in your IDE.

To make it work for the browser extension app you need to choose the following config options for Wallaby:

1. Configuration type: "Configuration File"
2. For the path to the Configuration File: `ENTER_YOUR_PATH_TO/lace/apps/browser-extension-wallet/wallaby.js`
