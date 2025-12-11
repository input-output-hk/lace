@OnboardingRestoreWalletBitcoin @Onboarding @Testnet @Mainnet
Feature: Onboarding - Restore Bitcoin wallet

  @LW-13961 @Smoke
  Scenario: Restore Bitcoin Wallet - Happy path
    Given I click "Restore" button on wallet setup page
    And "Select a Blockchain" page is displayed
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    Then "Bitcoin" blockchain is selected on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    When I see "Bitcoin warning" modal
    And I click "Understood" button on "Bitcoin warning" modal
    Then "Choose recovery method" page is displayed on "Restore" flow for Bitcoin chain
    And "Recovery phrase" is selected as a recovery method for Bitcoin chain
    When I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    When I enter 24 correct mnemonic words on "Mnemonic verification" page
    And I click "Next" button during wallet setup
    Then "Wallet setup" page is displayed
    When I enter wallet name: "BitcoinWallet", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I see LW homepage
    # TODO add better validation of the BTC home page

  @LW-13962
  Scenario: Restore Bitcoin Wallet - Select Bitcoin blockchain
    Given I click "Restore" button on wallet setup page
    When "Select a Blockchain" page is displayed
    Then "Cardano" blockchain is selected on the "Select a blockchain" page
    When I select "Bitcoin" blockchain on the "Select a blockchain" page
    Then "Bitcoin" blockchain is selected on the "Select a blockchain" page
    And "Next" button is enabled during onboarding process

  @LW-13963
  Scenario: Restore Bitcoin Wallet - Bitcoin warning modal - Cancel button
    Given I click "Restore" button on wallet setup page
    When "Select a Blockchain" page is displayed
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    When I see "Bitcoin warning" modal
    And I click "Cancel" button on "Bitcoin warning" modal
    Then "Select a Blockchain" page is displayed
    And "Bitcoin" blockchain is selected on the "Select a blockchain" page

  @LW-13964
  Scenario: Restore Bitcoin Wallet - Bitcoin warning modal - Understood button
    Given I click "Restore" button on wallet setup page
    When "Select a Blockchain" page is displayed
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    When I see "Bitcoin warning" modal
    When I click "Understood" button on "Bitcoin warning" modal
    Then "Choose recovery method" page is displayed on "Restore" flow for Bitcoin chain

  @LW-13965
  Scenario: Restore Bitcoin Wallet - Back navigation from Choose recovery method
    Given I click "Restore" button on wallet setup page
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    And I click "Understood" button on "Bitcoin warning" modal
    Then "Choose recovery method" page is displayed on "Restore" flow for Bitcoin chain
    When I click "Back" button during wallet setup
    Then "Select a Blockchain" page is displayed
    And "Bitcoin" blockchain is selected on the "Select a blockchain" page

