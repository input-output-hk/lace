@NetworkRequestsCounting @Testnet
Feature: Network requests counting

  @LW-12663
  Scenario: Count requests during HD wallet onboarding
    Given I start tracing
    When I restore the "HdWalletReadOnly1" wallet
    Then I see LW homepage
    And I confirm multi-address discovery modal
    When I navigate to Activity extended page
    And I end tracing
    Then there were approximately 171 requests sent (5% threshold)
