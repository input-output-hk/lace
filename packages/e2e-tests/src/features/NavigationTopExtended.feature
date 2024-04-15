@Top-Navigation-Extended
Feature: Top Navigation - Extended view

  Background:
    Given Lace is ready for test

  @LW-2318 @Smoke @Mainnet @Testnet
  Scenario: Top navigation is displayed containing logo and all appropriate buttons - Home page (tokens)
    Then all buttons and images in the top navigation are present

  @LW-2319 @Mainnet @Testnet
  Scenario Outline: Top navigation is displayed containing logo and all appropriate buttons - <page> page
    When I navigate to <page> extended page
    Then all buttons and images in the top navigation are present
    Examples:
      | page         |
      | Tokens       |
      | NFTs         |
      | Transactions |
      | Staking      |

  @LW-2320 @Mainnet @Testnet
  Scenario: Avatar dropdown displayed on click with content
    When I click the menu button
    Then the dropdown menu is visible
    And chevron icon is changed to up

  @LW-2321 @Mainnet @Testnet
  Scenario: Avatar dropdown displays a valid wallet sync status (synced)
    When I click the menu button
    Then wallet sync status component is visible
    And sync status displays "Wallet synced" state

  @LW-2322 @Mainnet @Testnet @Pending
  @issue=LW-10057
  Scenario: Avatar dropdown wallet address copy functions as expected
    Given I close wallet synced toast
    When I click the menu button
    Then the dropdown menu is visible
    When I click on the user details button
    Then I see a toast with text: "Copied to clipboard"

  @LW-4598 @Testnet
  Scenario: Extended View - network id is visible for Testnet
    Then I see network id: "Preprod"

  @LW-4598 @Mainnet
  Scenario: Extended View - network id is not visible for Mainnet
    Then I do not see network id: "Mainnet"

  @LW-4843 @Mainnet @Testnet
  Scenario Outline: Extended view - theme switcher - <theme> mode
    When I click the menu button
    And I set theme switcher to <theme> mode
    Then I can see application in <theme> mode
    Examples:
      | theme |
      | light |
      | dark  |

  @LW-4807 @Mainnet @Testnet
  Scenario: Extended View - User menu button is displayed
    Then Menu button is displayed
    And chevron icon is changed to down

  @LW-4808 @Mainnet @Testnet
  Scenario Outline: Extended View - User menu button and menu color change in <mode> mode
    When I click the menu button
    And I set theme switcher to <mode> mode
    Then I can see the user menu button in <mode> mode
    And I can see the user menu in <mode> mode
    Examples:
      | mode  |
      | light |
      | dark  |

  @LW-6069 @Testnet @Mainnet
  Scenario: Extended View - Current network name is displayed in expanded user menu
    When I click the menu button
    Then I see current network in user menu

  @LW-6070 @Testnet @Mainnet
  Scenario: Extended View - Network sub-menu is displayed when network option is clicked
    Given I click the menu button
    When I click on the network option
    Then I see network sub-menu

  @LW-6072 @Testnet @Mainnet
  Scenario: Extended View - Network sub-menu is closed when back button is clicked
    When I click the menu button
    And I click on the network option
    And I see network sub-menu
    When I click on then network sub-menu back button
    Then the dropdown menu is visible

  @LW-6073 @Testnet @Mainnet
  Scenario: Extended View - Toast displayed after switching network to Preview
    When I click the menu button
    And I click on the network option
    When I click on "Preview" radio button
    Then I see a toast with text: "Switched network"
    Then Lace is loaded properly

  @LW-6074 @Testnet @Mainnet
  Scenario: Extended View - Network switched after choosing Preview network
    Given I click the menu button
    And I see current network in user menu
    And I click on the network option
    When I click on "Preview" radio button
    Then Lace is loaded properly
    When I click the menu button
    And I click on the settings option
    Then I see current network: "Preview" name in network setting
    And I see current network: "Preview" name in "About Lace" widget
    And I see network id: "Preview"
    And Local storage appSettings contains info about network: "Preview"

  @LW-1717 @LW-5255 @Mainnet @Testnet
  Scenario: Avatar dropdown displays a valid wallet sync status (syncing) + toast & network pill
    Given I close wallet synced toast
    When I am in the offline network mode: true
    Then I see network id with status: offline
    And I see a toast with text: "Network Error"
    When I click the menu button
    Then wallet sync status component is visible
    And sync status displays "Not synced to the blockchain" state

  @LW-6769
  Scenario Outline: Extended view - Main Navigation - Collapsible Lace icon
    And I navigate to Tokens extended page
    When I resize the window to a width of: <width> and a height of: 840
    Then I <should_see> expanded icon
    Examples:
      | width | should_see |
      | 1070  | see        |
      | 768   | do not see |

  @LW-6907
  Scenario Outline: Extended view - Main Navigation - Collapsible Lace menu
    And I navigate to Tokens extended page
    When I resize the window to a width of: <width> and a height of: 840
    Then I see <menu_format> menu for <width> resolution
    When I hover on the menu
    Then I see expanded menu for <width> resolution
    Examples:
      | width | menu_format |
      | 1024  | collapsed   |
      | 1100  | expanded    |
