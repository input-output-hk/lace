@Settings-Extended
Feature: General Settings - Extended Browser View

  Background:
    Given Wallet is synced

  @LW-2324 @Smoke @Mainnet @Testnet
  Scenario: Extended View - Visibility of Settings page and its content
    When I open settings from header menu
    Then I see settings page
    And I see all category titles
    And I see all links in categories for extended view
    And I see all descriptions in categories for extended view

  @LW-2283 @Mainnet @Testnet
  Scenario: Extended View - Your keys - Visibility of "Show public key" button
    When I open settings from header menu
    And I click on "Your keys" setting
    Then I see Show public key button

  @LW-2387 @Mainnet @Testnet
  Scenario: Extended View - Visibility of About component on settings page
    When I open settings from header menu
    Then I see "About Lace" component

  @LW-2466 @Smoke @Mainnet @Testnet
  Scenario: Extended View - Opening and closing drawers
    When I open settings from header menu
    Then click on the following settings in extended view opens a drawer:
      | Title: Settings item that opens drawer             |
      | browserView.settings.wallet.network.title          |
      | browserView.settings.wallet.authorizedDApps.title  |
      | browserView.settings.wallet.general.title          |
#     temporarily disabled LW-2907
#     | Passphrase verification  |
      | browserView.settings.wallet.collateral.title       |
      | browserView.settings.security.showPassphrase.title |
      | browserView.settings.help.support.help             |

  @LW-2522 @Mainnet @Testnet
  Scenario: Extended View - Try to remove wallet and cancel
    And my local storage is fully initialized
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Back" button on "Remove wallet" modal
    Then I see settings page
    And I expect wallet repository and local storage to not be empty

  @LW-2613 @Mainnet @Testnet
  Scenario: Extended View - Show public key
    When I open settings from header menu
    And I click on "Your keys" setting
    And I click on Show public key button
    Then I see "TestAutomationWallet" wallet public key
    And I see "Show public key" page in extended mode
    And I see QR code
    And I see "Copy" button on "Show public key" page

  @LW-2614 @Mainnet @Testnet
  Scenario: Extended View - Copy public key
    When I open settings from header menu
    And I click on "Your keys" setting
    And I click on Show public key button
    And I click "Copy" button on "Show public key" page
    Then I see a toast with text: "Copied to clipboard"
    And I see that content of "TestAutomationWallet" public key is in clipboard

  @LW-2674 @Mainnet @Testnet
  Scenario: Extended View - Settings - Visibility of Network Options
    When I open settings from header menu
    And I click on "Network" setting
    Then I see network radio buttons

  @LW-2675 @Testnet
  Scenario: Extended View - Settings - Clicking on same network option
    When I open settings from header menu
    And I click on "Network" setting
    When I click on "Preprod" radio button
    Then I don't see a toast with text: "Switched network"
    And I close the drawer by clicking close button
    When I navigate to Tokens extended page
    Then I see network id: "Preprod"
    And I see "Preprod" specific tokens in extended mode

  @LW-2675 @Mainnet
  Scenario: Extended View - Settings - Clicking on same network option
    When I open settings from header menu
    And I click on "Network" setting
    When I click on "Mainnet" radio button
    Then I don't see a toast with text: "Switched network"
    And I close the drawer by clicking close button
    When I navigate to Tokens extended page
    Then I do not see network id: "Mainnet"
    And I see "Mainnet" specific tokens in extended mode

  @LW-5258 @Testnet
  Scenario: Extended View - Settings - Network name updated in settings, widget, logo, localStorage after network switching
    Given I am on Settings extended page
    And I see current network: "Preprod" name in network setting
    And I see current network: "Preprod" name in "About Lace" widget
    And I see network id: "Preprod"
    And Local storage appSettings contains info about network: "Preprod"
    When I switch network to: "Preview" in extended mode
    Then I see current network: "Preview" name in network setting
    And I see current network: "Preview" name in "About Lace" widget
    And I see network id: "Preview"
    And Local storage appSettings contains info about network: "Preview"

  @LW-5258 @Mainnet
  Scenario: Extended View - Settings - Network name updated in settings, widget, logo, localStorage after network switching
    Given I am on Settings extended page
    And I see current network: "Mainnet" name in network setting
    And I see current network: "Mainnet" name in "About Lace" widget
    And I do not see network id: "Mainnet"
    And Local storage appSettings contains info about network: "Mainnet"
    When I switch network to: "Preview" in extended mode
    Then I see current network: "Preview" name in network setting
    And I see current network: "Preview" name in "About Lace" widget
    And I see network id: "Preview"
    And Local storage appSettings contains info about network: "Preview"

  @LW-5259 @Mainnet @Testnet
  Scenario: Extended View - Settings - Toast displayed after switching network
    Given I am on Settings extended page
    When I switch network to: "Preview" without closing drawer
    Then I see a toast with text: "Switched network"

  @LW-2718 @Testnet
  Scenario: Extended View - Settings - Token/NFTs updated after network switching
    Given Wallet is synced
    And I am on Tokens extended page
    And I see "Preprod" specific tokens in extended mode
    When I switch network to: "Preview" in extended mode
    Then Wallet is synced
    When I navigate to Tokens extended page
    Then I see "Preview" specific tokens in extended mode
    When I navigate to NFTs extended page
    Then I see NFT with name: "Lace NFT Preview" on the NFTs page

  @LW-2718 @Mainnet
  Scenario: Extended View - Settings - Token/NFTs updated after network switching
    Given Wallet is synced
    And I am on Tokens extended page
    And I see "Mainnet" specific tokens in extended mode
    When I switch network to: "Preview" in extended mode
    Then Wallet is synced
    When I navigate to Tokens extended page
    Then I see "Preview" specific tokens in extended mode
    When I navigate to NFTs extended page
    Then I see NFT with name: "Lace NFT Preview" on the NFTs page

  @LW-4805 @Testnet
  Scenario: Extended View - Settings - Addresses are NOT shared and saved when switching Mainnet to Test Network
    Given I have 3 addresses in my address book in extended mode
    And I see address count: 3
    When I switch network to: "Mainnet" in extended mode
    And  I open address book in extended mode
    Then I see empty address book
    When I switch network to: "Preprod" in extended mode
    And  I open address book in extended mode
    Then I see address count: 3

  @LW-4805 @Mainnet
  Scenario: Extended View - Settings - Addresses are NOT shared and saved when switching Mainnet to Test Network
    Given I have 3 addresses in my address book in extended mode
    And I see address count: 3
    When I switch network to: "Preprod" in extended mode
    And  I open address book in extended mode
    Then I see empty address book

  @LW-5471 @Testnet
  Scenario: Extended View - Settings - Addresses entered in Preprod context are not available when switching to Preview
    Given I have 3 addresses in my address book in extended mode
    And I see address count: 3
    When I switch network to: "Preview" in extended mode
    And  I open address book in extended mode
    And I see address count: 0
    When I switch network to: "Preprod" in extended mode
    And  I open address book in extended mode
    Then I see address count: 3

  @LW-2776 @Mainnet @Testnet
  Scenario: Extended View - Settings - Terms and Conditions copy
    When I open settings from header menu
    When I click on "Terms and conditions" setting
    Then "Terms and conditions" are displayed in new tab

  @LW-2781 @Mainnet @Testnet
  Scenario: Extended View - Settings - Privacy policy copy
    When I open settings from header menu
    When I click on "Privacy policy" setting
    Then "Privacy policy" is displayed in new tab

  @LW-5830 @Mainnet @Testnet
  Scenario: Extended View - Settings - Cookie policy copy
    When I open settings from header menu
    And I click on "Cookie policy" setting
    Then "Cookie policy" is displayed in new tab

  @LW-2788 @Mainnet @Testnet
  Scenario: Extended View - Settings - Visibility of Help drawer
    When I open settings from header menu
    When I click on "Help" setting
    Then I see help details drawer in extended mode

  @LW-2789 @Mainnet @Testnet
  Scenario: Extended View - Settings - Help Create a ticket
    When I open settings from header menu
    When I click on "Help" setting
    And I click "Create a support ticket" button on Help drawer
    Then New tab with url containing "iohk.zendesk.com/hc/en-us/requests/new" is opened

  @LW-3629 @Mainnet @Testnet
  Scenario: Extended View - Settings - FAQ opening in a new tab
    When I open settings from header menu
    And I click on "FAQs" setting
    Then FAQ page is displayed


  @LW-3058 @Mainnet @Testnet
  Scenario: Extended view - Settings - Analytics option displayed
    When I open settings from header menu
    Then I see analytics option with proper description and toggle

  @LW-3869 @Mainnet @Testnet
  Scenario: Extended view - Settings - Show passphrase displayed above Analytics under the Security section in the Settings page
    When I open settings from header menu
    Then "Show recovery phrase" option is displayed as 1st one under "Security" section

  @LW-3871 @Mainnet @Testnet
  Scenario: Extended view - Settings - Side drawer containing password field and "Show passphrase" button is displayed after click on the "Show passphrase" option
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    And "Password" field is displayed
    And "Show passphrase" button is displayed

  @LW-3873 @Mainnet @Testnet
  Scenario: Extended view - Settings - When user enters wrong password on the "Show 24-word passphrase" drawer then error state "Wrong password" is displayed and the "Show passphrase" button is disabled
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill incorrect password
    And I click on "Show passphrase" button
    Then I see "browserView.transaction.send.error.invalidPassword" password error
    And "Show passphrase" button is disabled on "Show 24-word recovery phrase" drawer

  @LW-3875 @Mainnet @Testnet
  Scenario: Extended view - Settings - "Show passphrase" button enabled after user fills correct password on the "Show 24-word passphrase" side drawer
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    Then "Show passphrase" button is enabled on "Show 24-word recovery phrase" drawer

  @LW-3877 @LW-3879 @Mainnet @Testnet
  Scenario: Extended view - Settings - When user clicks on "Hide passphrase"/"Show passphrase" button on the "Show 24-word passphrase" side drawer all mnemonics are blurred/visible
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    Then "Show passphrase" button is enabled on "Show 24-word recovery phrase" drawer
    When I click on "Show passphrase" button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    When I click on "Hide passphrase" button
    Then all mnemonics are blurred
    When I click on "Show passphrase" button
    Then all mnemonics are not blurred
    And all mnemonics from "TestAutomationWallet" wallet are listed

  @LW-3919 @Mainnet @Testnet
  Scenario: Extended view - Settings - "Show passphrase" button enabled after user fills correct password on the "Show 24-word passphrase" side drawer
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    Then "Show passphrase" button is enabled on "Show 24-word recovery phrase" drawer
    When I click on "Show passphrase" button
    And all mnemonics from "TestAutomationWallet" wallet are listed
    And "Hide passphrase" button is displayed
    And "Hide passphrase" button is enabled on "Show 24-word recovery phrase" drawer

  @LW-4049 @Mainnet @Testnet
  Scenario Outline: Extended view - Settings - User has to enter password again after leaving "Show 24-word passphrase" side drawer - <action>
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    And I click on "Show passphrase" button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    When <step>
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    And Password field is empty
    Examples:
      | action             | step                                        |
      | click close button | I close the drawer by clicking close button |
      | click outside      | I click outside the drawer                  |

  @LW-4763 @Mainnet @Testnet
  Scenario: Extended View - Your keys - Enter and Escape buttons support
    When I open settings from header menu
    And I click on "Your keys" setting
    Then Drawer is displayed
    When I press keyboard Enter button
    Then I see "TestAutomationWallet" wallet public key
    When I press keyboard Escape button
    Then Drawer is not displayed

  @LW-4764 @Mainnet @Testnet
  Scenario: Extended View - Show passphrase - Enter and Escape buttons support
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Drawer is displayed
    When I fill correct password
    And I press keyboard Enter button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    When I press keyboard Enter button
    Then all mnemonics are blurred
    When I press keyboard Escape button
    Then "Show passphrase" button is not displayed

  @LW-4875 @Mainnet @Testnet
  Scenario: Extended View - Help setting - Escape button support
    When I open settings from header menu
    When I click on "Help" setting
    Then "Create a support ticket" button is displayed
    When I press keyboard Escape button
    Then "Create a support ticket" button is not displayed

  @LW-4876 @Mainnet @Testnet
  Scenario: Extended View - Remove wallet - Enter and Escape buttons support
    When I open settings from header menu
    And I click on Remove wallet button
    Then "Remove wallet" modal is displayed
    When I press keyboard Enter button
    Then "Remove wallet" modal is not displayed
    And I click on Remove wallet button
    Then "Remove wallet" modal is displayed
    When I press keyboard Escape button
    Then "Remove wallet" modal is not displayed

  @LW-5821 @Mainnet @Testnet
  Scenario: Remove and Onboard new wallet - address has been changed
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    And I accept analytics banner on "Get started" page
    Then "Get started" page is displayed
    When I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow
    When I click "Enter wallet" button
    Then I see LW homepage
    And I see a different wallet address than in my initial wallet

  @LW-5822 @Mainnet @Testnet
  Scenario: Remove and Restore wallet - address has been changed
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    And I accept analytics banner on "Get started" page
    Then "Get started" page is displayed
    When I click "Restore" button on wallet setup page
    And I go to "Wallet setup" page with wallet TAWalletNoFunds from "Restore" wallet flow
    When I click "Enter wallet" button
    Then I see LW homepage
    And I see a different wallet address than in my initial wallet

  # this test should be executed as the last one in this suite
  @LW-2521 @LW-9113 @Mainnet @Testnet
  Scenario: Extended View - Remove wallet and confirm
    And my local storage is fully initialized
    When I open settings from header menu
    Then I see Remove wallet section
    When I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    Then I see Analytics banner
    And I expect wallet repository and local storage to be empty
    And Mnemonic is not stored in background storage
