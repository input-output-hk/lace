@Runner4 @Send-Transaction-Metadata-Popup @Testnet @Mainnet
Feature: LW-2923: [Send Flow] Show visual clue for metadata characters limit

  Background:
    Given Wallet is synced

  @LW-2945
  Scenario: Popup View - Send - No metadata
    And I click "Send" button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I do not enter metadata
    Then Metadata counter is not displayed

  @LW-2946
  Scenario: Popup View - Send - No warning hint
    And I click "Send" button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I enter minimum metadata
    Then Metadata counter is displayed
    And Warning hint is not shown

  @LW-2947
  Scenario: Popup View - Send - Warning hint
    And I click "Send" button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I enter more than maximum metadata allowed
    Then Metadata counter is displayed
    And Warning hint is shown

  @LW-2948
  Scenario: Popup View - Send - Maximum metadata
    And I click "Send" button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I enter maximum metadata allowed
    Then Metadata counter is displayed
    And Warning hint is not shown

  @LW-6656
  Scenario: Popup View - Send - Delete metadata
    When I click "Send" button on Tokens page in popup mode
    And I’ve entered accepted values for all fields of simple Tx
    Then "Bin" button inside metadata input is disabled
    When I enter maximum metadata allowed
    Then "Bin" button inside metadata input is enabled
    When I click "Bin" button inside metadata input
    Then Metadata input is empty
    And "Bin" button inside metadata input is disabled
