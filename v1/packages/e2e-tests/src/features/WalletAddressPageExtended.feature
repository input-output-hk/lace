@WalletAddressPage-Extended @Testnet
Feature: Wallet address page

  Background:
    Given Wallet is synced

  @LW-11547
  Scenario: Extended View - Advanced mode toggle & drawer displayed in default (disabled) state
    When I click "Receive" button on page header
    Then I see "Wallet Address" "Advanced mode" toggle in unchecked state
    When I hover over "Advanced mode" toggle info icon
    Then I see tooltip for "Advanced mode" toggle info icon
    And I see "Wallet Address" page in extended mode for wallet "TestAutomationWallet"

  @LW-11549
  Scenario: Extended View - Advanced mode preserved after closing and opening the drawer
    Given I click "Receive" button on page header
    And I click "Wallet Address" "Advanced mode" toggle
    And I see "Wallet Address" "Advanced mode" toggle in checked state
    And I close the drawer by clicking close button
    And I navigate to Staking extended page
    When I click "Receive" button on page header
    Then I see "Wallet Address" "Advanced mode" toggle in checked state

  @LW-11553 @LW-11548 @LW-11550
  Scenario: Extended View - Advanced mode toggle click & drawer displayed in enabled state
    Given I click "Receive" button on page header
    When I click "Wallet Address" "Advanced mode" toggle
    Then I see Main address item in "Advanced mode"
    And I see "Additional addresses" divider in "Advanced mode"
    And I see "Additional addresses" cards in "Advanced mode"
    And I see "Add address" button enabled in "Advanced mode"
    And I do not see "Unused address" card in "Advanced mode"

  @LW-11551
  Scenario: Extended View - Hover over an address card in advanced mode & copy address
    When I click "Receive" button on page header
    And I click "Wallet Address" "Advanced mode" toggle
    And I save address for 2 address card
    When I hover over 2 address card
    Then I see copy button on 2 address card
    When I click copy button on 2 address card
    Then address is saved to clipboard
    And I see a toast with text: "Copied to clipboard"

  @LW-11552
  Scenario: Extended View - Advanced mode - "Add address" button displayed & click
    Given I click "Receive" button on page header
    And I click "Wallet Address" "Advanced mode" toggle
    And I see "Add address" button enabled in "Advanced mode"
    When I click "Add address" button in "Advanced mode"
    Then I see "Unused address" card in "Advanced mode" for "TestAutomationWallet" wallet
    And I see "Unused address" warning
    And I see "Add address" button disabled in "Advanced mode"

  @LW-11554 @LW-11555
  Scenario: Extended View - E2E - Unused address becoming used after sending some assets to this address
    Given I open wallet: "UnusedAddressWallet" in: extended mode
    And I click "Receive" button on page header
    And I click "Wallet Address" "Advanced mode" toggle
    And I click "Add address" button in "Advanced mode"
    And I see "Unused address" card in "Advanced mode"
    And I save unused address
    When I open wallet: "WalletSendingAdaToStakingE2E" in: extended mode
    And Wallet is synced
    And I click "Send" button on page header
    And I fill bundle with saved unused address and 2 ADA
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    And The Transaction submitted screen is displayed in extended mode
    And I close the drawer by clicking close button
    And I navigate to Activity extended page
    And the Sent transaction is displayed with value: "2.17 tADA" and tokens count 1
    And I open wallet: "UnusedAddressWallet" in: extended mode
    And I click "Receive" button on page header
    And I click "Wallet Address" "Advanced mode" toggle
    Then I do not see "Unused address" card in "Advanced mode"
    And I see "Add address" button enabled in "Advanced mode"
    When I click "Add address" button in "Advanced mode"
    And I see "Unused address" card in "Advanced mode"
    Then "Unused address" card address is different than the saved one
    And Saved "Unused address" card is penultimate
