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
    And I click on 'Your keys' setting
    Then I see Show public key button

  @LW-2712 @Mainnet @Testnet
  Scenario: Popup View - Visibility of About component on settings page
    Given I am on Tokens popup page
    When I open settings from header menu
    And I click on About component
    Then I see 'About Lace' component

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

  @LW-2707 @Mainnet @Testnet
  Scenario: Popup view - Try to remove wallet and cancel
    Given I am on Tokens popup page
    And my local storage is fully initialized
    When I open settings from header menu
    And I click on Remove wallet button
    And I click 'Back' button on 'Remove wallet' modal
    Then I see settings page
    And I expect wallet repository and local storage to not be empty

  @LW-2670 @Mainnet @Testnet
  Scenario: Popup View - Show public key
    Given I am on Tokens popup page
    When I open settings from header menu
    And I click on 'Your keys' setting
    And I click on Show public key button
    Then I see 'TestAutomationWallet' wallet public key
    And I see 'Show public key' page in popup mode
    And I see QR code
    And I see 'Copy' button on 'Show public key' page

  @LW-2671 @Mainnet @Testnet
  Scenario: Popup View - Copy public key
    Given I am on Tokens popup page
    When I open settings from header menu
    And I click on 'Your keys' setting
    And I click on Show public key button
    And I click 'Copy' button on 'Show public key' page
    Then I see a toast with text: 'Copied to clipboard'
    And I see that content of 'TestAutomationWallet' public key is in clipboard

  @LW-2716 @Mainnet @Testnet
  Scenario: Popup View - Settings - Network - Visibility of Network Options
    When I open settings from header menu
    And I click on 'Network' setting
    Then I see network radio buttons

  @LW-2717 @Testnet
  Scenario: Popup View - Settings - Clicking on same network option
    When I open settings from header menu
    And I click on 'Network' setting
    When I click on 'Preprod' radio button
    Then I don't see a toast with text: 'Switched network'
    And I close the drawer by clicking back button
    When I navigate to Tokens popup page
    Then I see network id: 'Preprod'
    And I see 'Preprod' specific tokens in popup mode

  @LW-2717 @Mainnet
  Scenario: Popup View - Settings - Clicking on same network option
    When I open settings from header menu
    And I click on 'Network' setting
    When I click on 'Mainnet' radio button
    Then I don't see a toast with text: 'Switched network'
    And I close the drawer by clicking back button
    When I navigate to Tokens popup page
    Then I do not see network id: 'Mainnet'
    And I see 'Mainnet' specific tokens in popup mode

  @LW-5260 @Testnet
  Scenario: Popup View - Settings - Network name updated in settings, logo, localStorage after network switching
    Given I am on Settings popup page
    And I see current network: 'Preprod' name in network setting
    And I see network id: 'Preprod'
    And Local storage appSettings contains info about network: 'Preprod'
    When I switch network to: 'Preview' in popup mode
    Then I see current network: 'Preview' name in network setting
    And I see network id: 'Preview'
    And Local storage appSettings contains info about network: 'Preview'

  @LW-5260 @Mainnet
  Scenario: Popup View - Settings - Network name updated in settings, logo, localStorage after network switching
    Given I am on Settings popup page
    And I see current network: 'Mainnet' name in network setting
    And I do not see network id: 'Mainnet'
    And Local storage appSettings contains info about network: 'Mainnet''
    When I switch network to: 'Preview' in popup mode
    Then I see current network: 'Preview' name in network setting
    And I see network id: 'Preview'
    And Local storage appSettings contains info about network: 'Preview'

  @LW-5261 @Testnet
  Scenario: Popup View - Settings - Network name in about Lace widget is updated after network switching
    When I open settings from header menu
    And I click on About component
    And I see current network: 'Preprod' name in 'About Lace' widget
    And I close the drawer by clicking back button
    When I switch network to: 'Preview' in popup mode
    And Wallet is synced
    And I click on About component
    Then I see current network: 'Preview' name in 'About Lace' widget

  @LW-5261 @Mainnet
  Scenario: Popup View - Settings - Network name in about Lace widget is updated after network switching
    When I open settings from header menu
    And I click on About component
    And I see current network: 'Mainnet' name in 'About Lace' widget
    And I close the drawer by clicking back button
    When I switch network to: 'Preview' in popup mode
    And Wallet is synced
    And I click on About component
    Then I see current network: 'Preview' name in 'About Lace' widget

  @LW-5262 @Mainnet @Testnet
  Scenario: Popup View - Settings - Toast displayed after switching network
    When I open settings from header menu
    When I switch network to: 'Preview' without closing drawer
    Then I see a toast with text: 'Switched network'

  @LW-2719 @Testnet
  Scenario: Popup View - Settings - Token/NFTs updated after network switching
    Given I am on Tokens popup page
    And I see 'Preprod' specific tokens in popup mode
    When I switch network to: 'Preview' in popup mode
    Then Wallet is synced
    When I navigate to Tokens popup page
    Then I see 'Preview' specific tokens in popup mode
    When I navigate to NFTs popup page
    Then I see NFT with name: 'Lace NFT Preview' on the NFTs page

  @LW-2719 @Mainnet
  Scenario: Popup View - Settings - Token/NFTs updated after network switching
    Given I am on Tokens popup page
    And I see 'Mainnet' specific tokens in popup mode
    When I switch network to: 'Preview' in popup mode
    Then Wallet is synced
    When I navigate to Tokens popup page
    Then I see 'Preview' specific tokens in popup mode
    When I navigate to NFTs popup page
    Then I see NFT with name: 'Lace NFT Preview' on the NFTs page

  @LW-4806 @Testnet
  Scenario: Popup View - Settings - Addresses are NOT shared and saved when switching Mainnet to Test Network
    Given I have 3 addresses in my address book in popup mode
    And I see address count: 3
    When I switch network to: 'Mainnet' in popup mode
    And  I open address book in popup mode
    Then I see empty address book
    When I switch network to: 'Preprod' in popup mode
    And  I open address book in popup mode
    Then I see address count: 3

  @LW-4806 @Mainnet
  Scenario: Popup View - Settings - Addresses are NOT shared and saved when switching Mainnet to Test Network
    Given I have 3 addresses in my address book in popup mode
    And I see address count: 3
    When I switch network to: 'Preprod' in popup mode
    And  I open address book in popup mode
    Then I see empty address book

  @LW-5472 @Testnet
  Scenario: Popup View - Settings - Addresses entered in Preprod context are not available when switching to Preview
    Given I have 3 addresses in my address book in popup mode
    And I see address count: 3
    When I switch network to: 'Preview' in popup mode
    And Wallet is synced
    And  I open address book in popup mode
    And I see address count: 0
    When I switch network to: 'Preprod' in popup mode
    And Wallet is synced
    And  I open address book in popup mode
    Then I see address count: 3
