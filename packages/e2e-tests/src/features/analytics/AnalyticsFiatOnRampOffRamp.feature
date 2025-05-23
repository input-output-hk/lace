@Analytics @Banxa-Extended @Testnet
Feature: Analytics - Fiat On Ramp & Off Ramp - Banxa

  Background:
    Given Wallet is synced

  @LW-10638
  Scenario: Fiat On & Off Ramp - Banxa - event tracking
    Given I switch network to: 'Mainnet' in extended mode
    When I navigate to Tokens extended page
    And I set up request interception for posthog analytics request(s)
    And I click on 'Buy ADA' button on Banxa's widget
    Then I validate latest analytics single event 'token | tokens | top your wallet | buy ada | click'
    When I click on 'Go Back' button on 'You're leaving Lace for Banxa' dialog
    Then I validate latest analytics single event 'token | buy ada | disclaimer | go back | click'
    When I click on 'Buy ADA' button on Banxa's widget
    And I click on 'Continue' button on 'You're leaving Lace for Banxa' dialog
    Then I validate latest analytics single event 'token | buy ada | disclaimer | continue | click'
    And I validate that 4 analytics event(s) have been sent
