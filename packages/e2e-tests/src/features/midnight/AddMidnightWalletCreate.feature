# Enable and re-check when LW-13474 is merged
@AddMidnightWalletCreate @Testnet @Mainnet @pending
Feature: Add Midnight wallet - Create wallet

  Background:
    Given Lace is ready for test

    @LW-13634
    Scenario: Add Midnight wallet - Create wallet - Testnet - Remote
      When I open header menu
      And I click on "Add Midnight wallet" option
      Then I see "Let's explore Web3 together" page for Midnight wallet onboarding
      When I click "Create" button on wallet setup page
      And I click on "Copy to clipboard" button
      And I click "Next" button during wallet setup
      And I click on "Paste from clipboard" button
      And I click "Next" button during wallet setup
      And I enter wallet name: "wallet", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
      And I click "Next" button during wallet setup
      Then "Configure Midnight" page is displayed
      And I click "Enter wallet" button during wallet setup
      When I enter wallet password and accept password prompt
      Then Midnight wallet is synced
      And I see main elements of "Tokens" page for Midnight wallet
      And "Send" button is disabled on page header
