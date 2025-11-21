@SendTx-Simple-Popup
Feature: LW-484: Send & Receive - Popup View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-4705 @Testnet @Mainnet
  Scenario: Popup View: Send - "Add asset" button becomes disabled once there are no assets to add
    When I click "Send" button on Tokens page in popup mode
    Then the 'Add asset' is enabled for bundle 1
    When I add all available token types to bundle 1
    And I add all available NFT types to bundle 1
    Then the 'Add asset' is disabled for bundle 1

  @LW-4648 @Testnet @Mainnet
  Scenario: Popup view - transaction drawer is displayed as specified
    When I click "Send" button on Tokens page in popup mode
    Then send drawer is displayed with all its components in popup mode

  @LW-3745 @Testnet
  Scenario: Popup-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click MAX button in bundle 1 for "tADA" asset
    Then the maximum available amount is displayed in bundle: 1 for "tADA" asset

  @LW-4736 @Testnet
  Scenario: Popup-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    And I click MAX button in bundle 1 for "LaceCoin1" asset
    Then the maximum available amount is displayed in bundle: 1 for "LaceCoin1" asset

  @LW-4736 @Mainnet
  Scenario: Popup-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "HOSKY Token"
    And I click MAX button in bundle 1 for "HOSKY" asset
    Then the maximum available amount is displayed in bundle: 1 for "HOSKY" asset

  @LW-4737 @Testnet
  Scenario: Popup-view - send maximum amount of multiple assets by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
#    disabled until "utxo fully depleted" error is fixed for MAX tADA
#    And I click MAX button in bundle 1 for "tADA" asset
#    Then the maximum available amount is displayed in bundle: 1 for "tADA" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    And I click MAX button in bundle 1 for "LaceCoin1" asset
    Then the maximum available amount is displayed in bundle: 1 for "LaceCoin1" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin2"
    And I click MAX button in bundle 1 for "LaceCoin2" asset
    Then the maximum available amount is displayed in bundle: 1 for "LaceCoin2" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Ibilecoin"
    Then the maximum available amount is displayed in bundle: 1 for "Ibilecoin" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Bison Coin"
    Then the maximum available amount is displayed in bundle: 1 for "Bison Coin" asset
    And "Review transaction" button is enabled on "Send" page

  @LW-4737 @Mainnet
  Scenario: Popup-view - send maximum amount of multiple assets by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click MAX button in bundle 1 for "tADA" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "HOSKY Token"
    And I click MAX button in bundle 1 for "HOSKY" asset
    Then the maximum available amount is displayed in bundle: 1 for "HOSKY" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "SUNDAE"
    And I click MAX button in bundle 1 for "SUNDAE" asset
    Then the maximum available amount is displayed in bundle: 1 for "SUNDAE" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Ibilecoin"
    Then the maximum available amount is displayed in bundle: 1 for "Ibilecoin" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Bison Coin"
    Then the maximum available amount is displayed in bundle: 1 for "Bison Coin" asset
    And "Review transaction" button is enabled on "Send" page

  @LW-4887 @Testnet @Mainnet
  Scenario: Popup-view - MAX button not displayed by default
    When I click "Send" button on Tokens page in popup mode
    Then the "MAX" button is not displayed

  @LW-4888 @Testnet @Mainnet
  Scenario: Popup-view - MAX button is displayed on hover when token value is 0
    And I click "Send" button on Tokens page in popup mode
    When I hover over the value for "tADA" asset in bundle 1
    Then the "MAX" button is displayed

  @LW-4889 @Testnet @Mainnet
  Scenario: Popup-view - MAX button is not displayed on hover when token value > 0
    And I click "Send" button on Tokens page in popup mode
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    When I hover over the value for "tADA" asset in bundle 1
    Then the "MAX" button is not displayed

  @LW-4890 @Testnet @Mainnet
  Scenario: Popup-view - MAX button is not displayed on hover when max token value is set
    And I click "Send" button on Tokens page in popup mode
    And I click MAX button in bundle 1 for "tADA" asset
    When I hover over the value for "tADA" asset in bundle 1
    Then the "MAX" button is not displayed

  @LW-5148 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - All tokens have been selected
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I add all available token types to bundle 1
    And I click "Add token or NFT" button for bundle 1
    Then "All gone! You've already selected everything" message is displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then "All gone! You've already selected everything" message is not displayed inside asset selector

  @LW-5149 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - All NFTs have been selected
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I add all available NFT types to bundle 1
    And I click "Add token or NFT" button for bundle 1
    Then "All gone! You've already selected everything" message is not displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then "All gone! You've already selected everything" message is displayed inside asset selector

  @LW-5150 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - All tokens and NFTs have been selected
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I add all available token types to bundle 1
    And I add all available NFT types to bundle 1
    And click on the coin selector for "tADA" asset in bundle 1
    Then "All gone! You've already selected everything" message is displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then "All gone! You've already selected everything" message is displayed inside asset selector

  @LW-5145 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - No search result for tokens
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And I enter "random characters" in asset search input
    Then "No results matching your search" message is displayed inside asset selector

  @LW-5146 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - No search result for NFTs
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I enter "random characters" in asset search input
    Then "No results matching your search" message is displayed inside asset selector

  @LW-5180 @Testnet
  Scenario Outline: Popup View - Send flow - Ticker displaying only 5 characters for <token> token
    And I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    When I save ticker for the Token with name: <token>
    And click on an token with name: "<token>"
    Then the displayed ticker for Tokens has the correct amount of characters
    When I hover over the ticker for "<token>" asset in bundle 1
    Then I see a tooltip showing full name: "<token>" for Tokens
    Examples:
      | token     |
      | tHOSKY    |
      | LaceCoin3 |
      | LaceCoin  |
      | LaceCoin2 |

  @LW-4595 @Testnet
  Scenario: Popup view - Send - Different network address, mainnet address from testnet
    And I click "Send" button on Tokens page in popup mode
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    And I enter a valid "mainnetShelley" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And "Review transaction" button is disabled on "Send" page

  @LW-4595 @Mainnet
  Scenario: Popup view - Send - Different network address, testnet address from mainnet
    And I click "Send" button on Tokens page in popup mode
    And I enter a value of: 1 to the "ADA" asset in bundle 1
    And I enter a valid "testnetShelley" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And "Review transaction" button is disabled on "Send" page

  @LW-3884 @Testnet @Mainnet
  Scenario: Extended View - Value can be altered from 1 when an NFT is added to a send transaction
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: "Ibilecoin"
    Then the "Ibilecoin" asset is displayed in bundle 1
    When I enter a value of: 1 to the "Ibilecoin" asset in bundle 1
    Then I see 1.00 as displayed value
    And "Review transaction" button is enabled on "Send" page
