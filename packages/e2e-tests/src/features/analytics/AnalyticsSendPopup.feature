@SendNft-Popup-E2E @Testnet
Feature: Analytics - Posthog - Sending - Popup View

  Background:
    Given I am on NFTs popup page
    And Wallet is synced
    And I'm in popup mode and select wallet that has NFT: "Ibilecoin"

  @LW-7828
  Scenario: Popup-view - Send Analytics - Success Screen - Close drawer - X button
    Given I set up request interception for posthog analytics request(s)
    And I'm sending an NFT with name: "Ibilecoin"
    Then I validate 2nd latest analytics single event "send | transaction data | review transaction | click"
    And I validate latest analytics single event "send | transaction summary | confirm | click"
    When I enter correct password and confirm the transaction
    And I validate 2nd latest analytics single event "send | transaction confirmation | confirm | click"
    Then The Transaction submitted screen is displayed in popup mode
    And I validate latest analytics single event "send | all done | view"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "send | all done | x | click"
    And I validate that 5 analytics event(s) have been sent
    

  @LW-7829
  Scenario: Popup-view - Send Analytics - Success Screen - Close drawer - Close button
    Given I set up request interception for posthog analytics request(s)
    And I'm sending an NFT with name: "Ibilecoin"
    Then I validate 2nd latest analytics single event "send | transaction data | review transaction | click"
    And I validate latest analytics single event "send | transaction summary | confirm | click"
    When I enter correct password and confirm the transaction
    And I validate 2nd latest analytics single event "send | transaction confirmation | confirm | click"
    Then The Transaction submitted screen is displayed in popup mode
    And I validate latest analytics single event "send | all done | view"
    When I click "Close" button on send success drawer
    Then I validate latest analytics single event "send | all done | close | click"
    And I validate that 5 analytics event(s) have been sent

  @LW-7830
  Scenario: Popup-view - Send Analytics - Success Screen - View transaction
    Given I set up request interception for posthog analytics request(s)
    And I'm sending an NFT with name: "Ibilecoin"
    Then I validate 2nd latest analytics single event "send | transaction data | review transaction | click"
    And I validate latest analytics single event "send | transaction summary | confirm | click"
    When I enter correct password and confirm the transaction
    And I validate 2nd latest analytics single event "send | transaction confirmation | confirm | click"
    Then The Transaction submitted screen is displayed in popup mode
    And I validate latest analytics single event "send | all done | view"
    And I click "View Transaction" button on send success drawer
    And I validate 2nd latest analytics single event "send | all done | view transaction | click"
    And I validate that 5 analytics event(s) have been sent

