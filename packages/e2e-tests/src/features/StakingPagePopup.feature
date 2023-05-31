@Staking-Popup @Testnet @Mainnet
Feature: Staking Page - Popup View

  Background:
    Given Lace is ready for test

  @LW-2487
  Scenario: Popup View - Staking page is present with title and counter
    When I navigate to Staking popup page
    Then I see Staking title displayed

  @LW-2488
  Scenario: Popup View - Staking search control is displayed with appropriate content
    When I navigate to Staking popup page
    Then I see stake pool search control with appropriate content

  @LW-2722
  Scenario: Popup View - Selecting stake pool from list opens drawer with appropriate details
    When I navigate to Staking popup page
    And I see stake pool search control with appropriate content
    And I input "Capital" to search bar
    And I click stake pool with the name "ADA Capital"
    Then I see drawer with "ADA Capital" stake pool details and a button available for staking
