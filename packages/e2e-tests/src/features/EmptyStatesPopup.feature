@EmptyStates-Popup @Mainnet @Testnet
Feature: Empty states

  Background:
    Given Lace with empty wallet is ready for test

  @LW-4447
  Scenario: Popup View - Tokens empty state
    Then I see empty state banner for Tokens page in popup mode
    And I do not see CoinGecko credits
    When I click "Copy" button on empty state banner
    Then I see a toast with text: "Copied to clipboard"

  @LW-2517 @LW-7239
  Scenario: Popup View - NFTs empty state
    When I navigate to NFTs popup page
    Then I see empty state banner for NFTs page in popup mode
    And I do not see "Create folder" button on NFTs page in popup mode
    When I click "Copy" button on empty state banner
    Then I see a toast with text: "Copied to clipboard"

  @LW-4448
  Scenario: Popup View - Transactions empty state
    When I navigate to Transactions popup page
    Then I see empty state banner for Transactions page in popup mode
    When I click "Copy" button on empty state banner
    Then I see a toast with text: "Copied to clipboard"

  @LW-8470
  Scenario: Popup View - Staking empty state
    And I navigate to Staking popup page
    Then I see empty state banner for Staking page in popup mode
    When I click "Copy" button on empty state banner
    Then I see a toast with text: "Copied to clipboard"

  @LW-5522
  Scenario: Popup View - Settings - Not enough Ada for Collateral
    When I open settings from header menu
    And I click on "Collateral" setting
    Then Collateral drawer with not enough ADA error is displayed

  @LW-6875
  Scenario: Popup view - Hide my balance - no eye icon for wallet with no funds
    Then Eye icon is not displayed on Tokens page

  @LW-12032
  Scenario: Popup View - "Delegate your voting power" banner is not displayed if user has no funds
    When I navigate to Staking popup page
    Then "Delegate your voting power" banner is not displayed
