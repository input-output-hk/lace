@Staking-Popup @Testnet @Mainnet @Pending
Feature: Staking Page - Popup View

  Background:
    Given Lace is ready for test

  @LW-2487
  Scenario: Popup View - Staking page is present with title and counter
    When I navigate to Staking popup page
    Then I see Staking title and counter with total number of pools displayed

  @LW-2722
  Scenario: Popup View - Selecting stake pool from list opens drawer with appropriate details
    When I navigate to Staking popup page
    And I input "Capital" to the search bar
    And I click stake pool with name "ADA Capital"
    Then I see drawer with "ADA Capital" stake pool details and a button available for staking
