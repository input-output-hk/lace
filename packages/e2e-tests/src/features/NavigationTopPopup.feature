@Top-Navigation-Popup
Feature: Top Navigation - Popup view

  Background:
    Given Lace is ready for test

  @LW-4724 @Mainnet @Testnet
  Scenario: Avatar dropdown displayed on click with content
    When I click the menu button
    Then the dropdown menu is visible
    And chevron icon is changed to up

  @LW-4725 @Mainnet @Testnet
  Scenario: Avatar dropdown displays a valid wallet sync status (synced)
    When I click the menu button
    Then wallet sync status component is visible
    And sync status displays "Wallet synced" state

  @LW-4727 @Mainnet @Testnet
  Scenario: Avatar dropdown wallet address copy functions as expected
    When I click the menu button
    Then the dropdown menu is visible
    When I click on the user details button
    Then I see a toast with message: "general.clipboard.copiedToClipboard"

  @LW-4599 @Testnet
  Scenario: Popup View - network id is visible next to Lace logo for Testnet
    Then I see network id next to Lace logo for: "Preprod"

  @LW-4599 @Mainnet
  Scenario: Popup View - network id is not visible next to Lace logo for Mainnet
    Then I don't see network id next to Lace logo for: "Mainnet"

  @LW-4809 @Mainnet @Testnet
  Scenario: Popup View - User menu button is displayed
    Then Menu button is displayed
    And chevron icon is changed to down

  @LW-4810 @Mainnet @Testnet
  Scenario Outline: Popup View - User menu button and menu color change in <mode> mode
    When I click the menu button
    And I set theme switcher to <mode> mode
    Then I can see the user menu button in <mode> mode
    And I can see the user menu in <mode> mode
    Examples:
      | mode  |
      | light |
      | dark  |

  @LW-6075 @Testnet @Mainnet
  Scenario: Popup View - Current network name is displayed in expanded user menu
    When I click the menu button
    Then I see current network in user menu

  @LW-6076 @Testnet @Mainnet
  Scenario: Popup View - Network sub-menu is displayed when network option is clicked
    Given I click the menu button
    When I click on the network option
    Then I see network sub-menu

  @LW-6077 @Testnet @Mainnet
  Scenario: Popup View - Network sub-menu is closed when back button is clicked
    When I click the menu button
    And I click on the network option
    And I see network sub-menu
    When I click on then network sub-menu back button
    Then the dropdown menu is visible

  @LW-6078 @Testnet @Mainnet @Pending
  # Bug https://input-output.atlassian.net/browse/LW-8530
  Scenario: Popup View - Toast displayed after switching network to Preview and menu not closed after switching
    When I click the menu button
    And I click on the network option
    When I click on "Preview" radio button
    Then I see a toast with message: "browserView.settings.wallet.network.networkSwitched"
    And I see network sub-menu

  @LW-6079 @Testnet @Mainnet @Pending
  # Bug https://input-output.atlassian.net/browse/LW-8530
  Scenario: Popup View - Network switched after choosing Preview network
    Given I click the menu button
    And I see current network in user menu
    And I click on the network option
    When I click on "Preview" radio button
    And I click on then network sub-menu back button
    And I click on the settings option
    Then I see current network: "Preview" name in network setting
    And I see network id: "Preview" next to Lace logo
    And Local storage appSettings contains info about network: "Preview"

  @LW-4726 @LW-5254 @Mainnet @Testnet
  Scenario: Avatar dropdown displays a valid wallet sync status (syncing) + toast & network pill
    When I am in the offline network mode: true
    Then I see network pill indicates that status is offline next to Lace logo
    And I see a toast with message: "general.errors.networkError"
    When I click the menu button
    Then wallet sync status component is visible
    And sync status displays "Not synced to the blockchain" state
