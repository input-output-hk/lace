@SendTx-Simple-Extended
Feature: LW-484: Send & Receive - Extended Browser View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-3558 @Testnet @Mainnet
  Scenario Outline: Extended View - Single <value> validation
    When I click 'Send' button on page header
    When I enter a valid 'shelley' address in the bundle 1 recipient's address
    Then I enter a value of: <value>  to the 'tADA' asset in bundle 1
    And I open cancel modal to trigger button validation
    Then 'Insufficient balance' error <should_see> displayed on 'Send' page
    Then 'Review transaction' button is <status> on 'Send' page
    Examples:
      | value    | should_see | status   |
      | 2        | is not     | enabled  |
      | 99999999 | is         | disabled |

  @LW-1781 @Testnet @Mainnet
  Scenario: Extended View: Send - 'Add asset' button becomes disabled once there are no assets to add
    When I click 'Send' button on page header
    Then the 'Add asset' is enabled for bundle 1
    When I add all available token types to bundle 1
    And I add all available NFT types to bundle 1
    Then the 'Add asset' is disabled for bundle 1

  @LW-3744 @Testnet
  Scenario: Extended-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click MAX button in bundle 1 for 'tADA' asset
    Then the maximum available amount is displayed in bundle: 1 for 'tADA' asset

  @LW-4883 @Testnet @Mainnet
  Scenario: Extended-view - MAX button not displayed by default
    When I click 'Send' button on page header
    Then the 'MAX' button is not displayed

  @LW-4884 @Testnet @Mainnet
  Scenario: Extended-view - MAX button is displayed on hover when token value is 0
    And I click 'Send' button on page header
    When I hover over the value for 'tADA' asset in bundle 1
    Then the 'MAX' button is displayed

  @LW-4885 @Testnet @Mainnet
  Scenario: Extended-view - MAX button is not displayed on hover when token value > 0
    And I click 'Send' button on page header
    And I enter a value of: 1 to the 'tADA' asset in bundle 1
    When I hover over the value for 'tADA' asset in bundle 1
    Then the 'MAX' button is not displayed

  @LW-4886 @Testnet @Mainnet
  Scenario: Extended-view - MAX button is not displayed on hover when max token value is set
    And I click 'Send' button on page header
    And I click MAX button in bundle 1 for 'tADA' asset
    When I hover over the value for 'tADA' asset in bundle 1
    Then the 'MAX' button is not displayed

  @LW-4762 @Testnet @Mainnet
  Scenario: Extended View - Send flow - Enter and Escape buttons support
    When I click 'Send' button on page header
    And I press keyboard Enter button
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I enter a value of: 1 to the 'tADA' asset in bundle 1
    When I press keyboard Enter button
    Then The Tx summary screen is displayed:
      | ignored |
    When I press keyboard Enter button
    Then The password screen is displayed:
      | ignored |
    When I press keyboard Escape button
    Then The Tx summary screen is displayed:
      | ignored |
    When I press keyboard Escape button
    Then send drawer is displayed with all its components in extended mode
    When I press keyboard Escape button
    Then a popup asking if you're sure you'd like to close it is displayed
    And I press keyboard Escape button
    Then send drawer is displayed with all its components in extended mode
    When I press keyboard Escape button
    Then a popup asking if you're sure you'd like to close it is displayed
    When I press keyboard Enter button
    Then Drawer is not displayed

  @LW-5141 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - All tokens have been selected
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I add all available token types to bundle 1
    And I click 'Add token or NFT' button for bundle 1
    Then 'All gone! You've already selected everything' message is displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then 'All gone! You've already selected everything' message is not displayed inside asset selector

  @LW-5142 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - All NFTs have been selected
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I add all available NFT types to bundle 1
    And I click 'Add token or NFT' button for bundle 1
    Then 'All gone! You've already selected everything' message is not displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then 'All gone! You've already selected everything' message is displayed inside asset selector

  @LW-5143 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - All tokens and NFTs have been selected
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I add all available token types to bundle 1
    And I add all available NFT types to bundle 1
    And click on the coin selector for 'tADA' asset in bundle 1
    Then 'All gone! You've already selected everything' message is displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then 'All gone! You've already selected everything' message is displayed inside asset selector

  @LW-5147 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - No search result for tokens
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click 'Add token or NFT' button for bundle 1
    And I enter 'random characters' in asset search input
    Then 'No results matching your search' message is displayed inside asset selector

  @LW-5144 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - No search result for NFTs
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click 'Add token or NFT' button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I enter 'random characters' in asset search input
    Then 'No results matching your search' message is displayed inside asset selector

  @LW-1604 @Testnet @Pending
  @issue=LW-9104
  Scenario: 'Insufficient funds' error for extended view & advanced tx type for multiple assets
    And I save token: 'Cardano' balance
    And I save token: 'LaceCoin' balance
    And I save token: 'LaceCoin2' balance
    When I click 'Send' button on page header
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I enter a 110% of total 'tADA' asset in bundle 1
    And I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'LaceCoin'
    And I enter a 110% of total 'LaceCoin1' asset in bundle 1
    And I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'LaceCoin2'
    And I enter a 110% of total 'LaceCoin2' asset in bundle 1
    Then I see insufficient balance error in bundle 1 for 'tADA' asset
    And I see insufficient balance error in bundle 1 for 'LaceCoin1' asset
    And I see insufficient balance error in bundle 1 for 'LaceCoin2' asset
    And 'Review transaction' button is disabled on 'Send' page

  @LW-4595 @Testnet
  Scenario: Extended view - Send - Different network address, mainnet address from testnet
    And I click 'Send' button on page header
    And I enter a value of: 1 to the 'tADA' asset in bundle 1
    And I enter a valid 'mainnetShelley' address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And 'Review transaction' button is disabled on 'Send' page

  @LW-4595 @Mainnet
  Scenario: Extended view - Send - Different network address, testnet address from mainnet
    And I click 'Send' button on page header
    And I enter a value of: 1 to the 'ADA' asset in bundle 1
    And I enter a valid 'testnetShelley' address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And 'Review transaction' button is disabled on 'Send' page

  @LW-4595 @Mainnet
  Scenario Outline: Extended view - Send - Different network address, <network> from mainnet
    And I switch network to: 'Preprod' in extended mode
    And I navigate to Tokens extended page
    And I click 'Send' button on page header
    And I enter a valid '<network>' address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    Examples:
      | network        |
      | mainnetShelley |
      | mainnetByron   |
      | mainnetIcarus  |

  @LW-4595 @Testnet
  Scenario Outline: Extended view - Send - Different network address, <network> from mainnet
    And I switch network to: 'Mainnet' in extended mode
    And I navigate to Tokens extended page
    And I click 'Send' button on page header
    And I enter a valid '<network>' address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    Examples:
      | network        |
      | testnetShelley |
      | testnetByron   |
      | testnetIcarus  |
