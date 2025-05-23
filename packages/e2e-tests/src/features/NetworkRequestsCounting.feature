@NetworkRequestsCounting @Testnet
Feature: Network requests counting

  @LW-12663 @skip(browserName='firefox')
  Scenario: Count requests during HD wallet onboarding
    Given I start tracing
    And I start counting requests using Puppeteer and CDP
    When I restore the 'HdWalletReadOnly1' wallet
    Then I see LW homepage
    And I confirm multi-address discovery modal
    And Wallet is synced
    When I navigate to Activity extended page
    And I end tracing
    Then there were approximately 173 requests sent (5% threshold) [getPageWeight()]
    Then there were approximately 211 requests sent (5% threshold) [Puppeteer and CDP]
