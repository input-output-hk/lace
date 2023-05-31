@EmptyStates-Extended @Mainnet @Testnet
Feature: Empty states

  Background:
    Given Lace with empty wallet is ready for test

  @LW-4444 @Smoke
  Scenario: Extended View - Tokens empty state
    And Tokens counter matches the number of wallet tokens
    Then I see empty state banner for Tokens page in extended mode
    And I do not see CoinGecko credits
    When I click "Copy" button on empty state banner
    Then I see a toast with message: "general.clipboard.copiedToClipboard"

  @LW-2516
  Scenario: Extended View - NFTs empty state
    When I navigate to NFTs extended page
    Then I see empty state banner for NFTs page in extended mode
    When I click "Copy" button on empty state banner
    Then I see a toast with message: "general.clipboard.copiedToClipboard"

  @LW-4445 @Smoke
  Scenario: Extended View - Transactions empty state
    When I navigate to Transactions extended page
    Then I see empty state banner for Transactions page in extended mode
    When I click "Copy" button on empty state banner
    Then I see a toast with message: "general.clipboard.copiedToClipboard"

  @LW-4446
  Scenario: Extended View - Staking empty state
    When I navigate to Staking extended page
    Then I see empty state banner for Staking page in extended mode
    When I click "Copy" button on empty state banner
    Then I see a toast with message: "general.clipboard.copiedToClipboard"

  @LW-3746
  Scenario: Extended-view - verify that MAX button is hidden when user has no tokens available in the wallet
    When I click "Send" button on page header
    Then the "MAX" button is not displayed

  @LW-5139
  Scenario: Extended-view - Empty wallet - Send - Empty state in token selector - Tokens tab
    When I click "Send" button on page header
    And click on the coin selector for "tADA" asset in bundle 1
    Then "You don't have any tokens" message is displayed inside asset selector

  @LW-5140
  Scenario: Extended-view - Empty wallet - Send - Empty state in token selector - NFTs tab
    When I click "Send" button on page header
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    Then "You don't have any NFTs to send" message is displayed inside asset selector

  @LW-5521
  Scenario: Extended View - Settings - Not enough Ada for Collateral
    When I open settings from header menu
    And I click on "Collateral" setting
    Then Collateral drawer with not enough ADA error is displayed
