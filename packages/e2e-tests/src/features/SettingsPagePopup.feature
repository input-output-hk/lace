@Settings-Popup
Feature: General Settings - Popup View

  Background:
    Given Lace is ready for test

  @LW-2709 @Mainnet @Testnet
  Scenario: Popup View - Visibility of Settings page and its content
    Given I am on Tokens popup page
    When I open settings from header menu
    Then I see settings page
    And I see all category titles
    And I see all links in categories for popup view
    And I see all descriptions in categories for popup view

  @LW-2711 @Mainnet @Testnet
  Scenario: Popup View - General - Visibility of Public Key button
    Given I am on Tokens popup page
    When I open settings from header menu
    And I click on "Your keys" setting
    Then I see Show public key button

  @LW-2712 @Mainnet @Testnet
  Scenario: Popup View - Visibility of About component on settings page
    Given I am on Tokens popup page
    When I open settings from header menu
    And I click on About component
    Then I see "About Lace" component

  @LW-2466 @Mainnet @Testnet
  Scenario: Popup View - Opening and closing drawers
    Given I am on Tokens popup page
    And I open settings from header menu
    Then click on the following settings in popup view opens a drawer:
      | Title: Settings item that opens drawer             |
      | browserView.settings.wallet.about.title            |
      | browserView.settings.wallet.network.title          |
      | browserView.settings.wallet.authorizedDApps.title  |
      | browserView.settings.wallet.general.title          |
      | browserView.settings.wallet.collateral.title       |
#     temporarily disabled LW-2907
#     | browserView.settings.security.passphrasePeriodicVerification.title  |
      | browserView.settings.security.showPassphrase.title |
      | browserView.settings.help.support.help             |
      | browserView.settings.legal.tnc.title               |
      | browserView.settings.legal.privacyPolicy.title     |
      | browserView.settings.legal.cookiePolicy.title      |

  @LW-2707 @Mainnet @Testnet
  Scenario: Popup view - Try to remove wallet and cancel
    Given I am on Tokens popup page
    And my local storage is fully initialized
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Back" button on "Remove wallet" modal
    Then I see settings page
    And I expect wallet repository and local storage to not be empty

  @LW-2670 @Mainnet @Testnet
  Scenario: Popup View - Show public key
    Given I am on Tokens popup page
    When I open settings from header menu
    And I click on "Your keys" setting
    And I click on Show public key button
    Then I see "TestAutomationWallet" wallet public key
    And I see "Show public key" page in popup mode
    And I see QR code
    And I see "Copy" button on "Show public key" page

  @LW-2671 @Mainnet @Testnet
  Scenario: Popup View - Copy public key
    Given I am on Tokens popup page
    When I open settings from header menu
    And I click on "Your keys" setting
    And I click on Show public key button
    And I click "Copy" button on "Show public key" page
    Then I see a toast with text: "Copied to clipboard"
    And I see that content of "TestAutomationWallet" public key is in clipboard

  @LW-2716 @Mainnet @Testnet
  Scenario: Popup View - Settings - Network - Visibility of Network Options
    When I open settings from header menu
    And I click on "Network" setting
    Then I see network radio buttons

  @LW-2717 @Testnet
  Scenario: Popup View - Settings - Clicking on same network option
    When I open settings from header menu
    And I click on "Network" setting
    When I click on "Preprod" radio button
    Then I don't see a toast with message: "browserView.settings.wallet.network.networkSwitched"
    And I close the drawer by clicking back button
    When I navigate to Tokens popup page
    Then I see network id: "Preprod"
    And I see "Preprod" specific tokens in popup mode

  @LW-2717 @Mainnet
  Scenario: Popup View - Settings - Clicking on same network option
    When I open settings from header menu
    And I click on "Network" setting
    When I click on "Mainnet" radio button
    Then I don't see a toast with message: "browserView.settings.wallet.network.networkSwitched"
    And I close the drawer by clicking back button
    When I navigate to Tokens popup page
    Then I do not see network id: "Mainnet"
    And I see "Mainnet" specific tokens in popup mode

  @LW-5260 @Testnet
  Scenario: Popup View - Settings - Network name updated in settings, logo, localStorage after network switching
    Given I am on Settings popup page
    And I see current network: "Preprod" name in network setting
    And I see network id: "Preprod"
    And Local storage appSettings contains info about network: "Preprod"
    When I switch network to: "Preview" in popup mode
    Then I see current network: "Preview" name in network setting
    And I see network id: "Preview"
    And Local storage appSettings contains info about network: "Preview"

  @LW-5260 @Mainnet
  Scenario: Popup View - Settings - Network name updated in settings, logo, localStorage after network switching
    Given I am on Settings popup page
    And I see current network: "Mainnet" name in network setting
    And I do not see network id: "Mainnet"
    And Local storage appSettings contains info about network: "Mainnet""
    When I switch network to: "Preview" in popup mode
    Then I see current network: "Preview" name in network setting
    And I see network id: "Preview"
    And Local storage appSettings contains info about network: "Preview"

  @LW-5261 @Testnet
  Scenario: Popup View - Settings - Network name in about Lace widget is updated after network switching
    When I open settings from header menu
    And I click on About component
    And I see current network: "Preprod" name in "About Lace" widget
    And I close the drawer by clicking back button
    When I switch network to: "Preview" in popup mode
    And Wallet is synced
    And I click on About component
    Then I see current network: "Preview" name in "About Lace" widget

  @LW-5261 @Mainnet
  Scenario: Popup View - Settings - Network name in about Lace widget is updated after network switching
    When I open settings from header menu
    And I click on About component
    And I see current network: "Mainnet" name in "About Lace" widget
    And I close the drawer by clicking back button
    When I switch network to: "Preview" in popup mode
    And Wallet is synced
    And I click on About component
    Then I see current network: "Preview" name in "About Lace" widget

  @LW-5262 @Mainnet @Testnet
  Scenario: Popup View - Settings - Toast displayed after switching network
    When I open settings from header menu
    When I switch network to: "Preview" without closing drawer
    Then I see a toast with text: "Switched network"

  @LW-2719 @Testnet
  Scenario: Popup View - Settings - Token/NFTs updated after network switching
    Given I am on Tokens popup page
    And I see "Preprod" specific tokens in popup mode
    When I switch network to: "Preview" in popup mode
    Then Wallet is synced
    When I navigate to Tokens popup page
    Then I see "Preview" specific tokens in popup mode
    When I navigate to NFTs popup page
    Then I see NFT with name: "Lace NFT Preview" on the NFTs page

  @LW-2719 @Mainnet
  Scenario: Popup View - Settings - Token/NFTs updated after network switching
    Given I am on Tokens popup page
    And I see "Mainnet" specific tokens in popup mode
    When I switch network to: "Preview" in popup mode
    Then Wallet is synced
    When I navigate to Tokens popup page
    Then I see "Preview" specific tokens in popup mode
    When I navigate to NFTs popup page
    Then I see NFT with name: "Lace NFT Preview" on the NFTs page

  @LW-4806 @Testnet
  Scenario: Popup View - Settings - Addresses are NOT shared and saved when switching Mainnet to Test Network
    Given I have 3 addresses in my address book in popup mode
    And I see address count: 3
    When I switch network to: "Mainnet" in popup mode
    And  I open address book in popup mode
    Then I see empty address book
    When I switch network to: "Preprod" in popup mode
    And  I open address book in popup mode
    Then I see address count: 3

  @LW-4806 @Mainnet
  Scenario: Popup View - Settings - Addresses are NOT shared and saved when switching Mainnet to Test Network
    Given I have 3 addresses in my address book in popup mode
    And I see address count: 3
    When I switch network to: "Preprod" in popup mode
    And  I open address book in popup mode
    Then I see empty address book

  @LW-5472 @Testnet
  Scenario: Popup View - Settings - Addresses entered in Preprod context are not available when switching to Preview
    Given I have 3 addresses in my address book in popup mode
    And I see address count: 3
    When I switch network to: "Preview" in popup mode
    And Wallet is synced
    And  I open address book in popup mode
    And I see address count: 0
    When I switch network to: "Preprod" in popup mode
    And Wallet is synced
    And  I open address book in popup mode
    Then I see address count: 3

  @LW-2775 @Mainnet @Testnet
  Scenario: Popup View - Settings - Terms and Conditions copy
    When I open settings from header menu
    When I click on "Terms and conditions" setting
    Then the Terms and Conditions copy is displayed

  @LW-2782 @Mainnet @Testnet
  Scenario: Popup View - Settings - Privacy policy copy
    When I open settings from header menu
    When I click on "Privacy policy" setting
    Then the Privacy policy copy is displayed in popup mode

  @LW-5831 @Mainnet @Testnet
  Scenario: Popup View - Settings - Cookie policy copy
    When I open settings from header menu
    And I click on "Cookie policy" setting
    Then the Cookie policy drawer is displayed in popup mode

  @LW-2790 @Mainnet @Testnet
  Scenario: Popup View - Settings - Visibility of Help drawer
    When I open settings from header menu
    When I click on "Help" setting
    Then I see help details drawer in popup mode

  @LW-2791 @Mainnet @Testnet
  Scenario: Popup View - Settings - Help Create a ticket
    When I open settings from header menu
    When I click on "Help" setting
    And I click "Create a support ticket" button on Help drawer
    Then New tab with url containing "iohk.zendesk.com/hc/en-us/requests/new" is opened

  @LW-3630 @Mainnet @Testnet
  Scenario: Popup View - Settings - FAQ opening in a new tab
    When I open settings from header menu
    And I click on "FAQs" setting
    Then FAQ page is displayed

  @LW-3870 @Mainnet @Testnet
  Scenario: Extended view - Settings - Show passphrase displayed above Analytics under the Security section in the Settings page
    When I open settings from header menu
    Then "Show recovery phrase" option is displayed as 1st one under "Security" section

  @LW-3872 @Mainnet @Testnet
  Scenario: Popup view - Settings - Side drawer containing password field and "Show passphrase" button is displayed after click on the "Show passphrase" option
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    And "Password" field is displayed
    And "Show passphrase" button is displayed

  @LW-3874 @Mainnet @Testnet
  Scenario: Popup view - Settings - When user enter wrong password on the "Show 24-word passphrase" drawer then error state "Wrong password" is displayed and the "Show passphrase" button is disabled
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill incorrect password
    And I click on "Show passphrase" button
    Then I see "browserView.transaction.send.error.invalidPassword" password error
    And "Show passphrase" button is disabled on "Show 24-word recovery phrase" drawer

  @LW-3878 @LW-3890 @Mainnet @Testnet
  Scenario: Popup view - Settings - When user clicks on "Hide passphrase"/"Show passphrase" button on the "Show 24-word passphrase" side drawer all mnemonics are blurred/visible
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

  @LW-3920 @Mainnet @Testnet
  Scenario: Popup view - Settings - "Show passphrase" button enabled after user fills correct password on the "Show 24-word passphrase" side drawer
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    Then "Show passphrase" button is enabled on "Show 24-word recovery phrase" drawer
    When I click on "Show passphrase" button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    And "Hide passphrase" button is displayed
    And "Hide passphrase" button is enabled on "Show 24-word recovery phrase" drawer

  @LW-4050 @Mainnet @Testnet
  Scenario: Popup view - Settings - User has to enter password again after leaving "Show 24-word passphrase" side drawer
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    And I click on "Show passphrase" button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    When I close the drawer by clicking back button
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    And Password field is empty

  @LW-3061 @Mainnet @Testnet
  Scenario: Popup view - Settings - Analytics option displayed
    Given I open settings from header menu
    Then I see analytics option with proper description and toggle

    # this test should be executed as the last one in this suite
  @LW-2708 @Mainnet @Testnet
  Scenario: Popup View - Remove wallet and confirm
    Given I am on Tokens popup page
    And my local storage is fully initialized
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    And I switch to last window
    Then I see Analytics banner
    And I expect wallet repository and local storage to be empty
    And Mnemonic is not stored in background storage
