@Send-Transaction-Metadata-Extended @Testnet @Mainnet
Feature: LW-2923: [Send Flow] Show visual clue for metadata characters limit

  Background:
    Given Wallet is synced

  @LW-2941
  Scenario: Extended View - Send - No metadata
    And I click "Send" button on page header
    When I’ve entered accepted values for all fields of simple Tx
    And I do not enter metadata
    Then Metadata counter is not displayed

  @LW-2942
  Scenario: Extended View - Send - Metadata input 1 char
    And I click "Send" button on page header
    When I’ve entered accepted values for all fields of simple Tx
    And I enter minimum metadata
    Then Metadata counter is displayed
    And Warning hint is not shown

  @LW-2943
  Scenario: Extended View - Send - Warning hint
    And I click "Send" button on page header
    When I’ve entered accepted values for all fields of simple Tx
    And I enter more than maximum metadata allowed
    Then Metadata counter is displayed
    And Warning hint is shown

  @LW-2944
  Scenario: Extended View - Send - Maximum metadata
    And I click "Send" button on page header
    When I’ve entered accepted values for all fields of simple Tx
    And I enter maximum metadata allowed
    Then Metadata counter is displayed
    And Warning hint is not shown

  @LW-6655
  Scenario: Extended View - Send - Delete metadata
    When I click "Send" button on page header
    And I’ve entered accepted values for all fields of simple Tx
    Then "Bin" button inside metadata input is disabled
    When I enter maximum metadata allowed
    Then "Bin" button inside metadata input is enabled
    When I click "Bin" button inside metadata input
    Then Metadata input is empty
    And "Bin" button inside metadata input is disabled

