@AddNewWalletCreate @Testnet @Mainnet
Feature: Add new wallet - Create wallet

  Background:
    Given Lace is ready for test

  @LW-9334
  Scenario: Extended-view - Multi-wallet - "Add new wallet" option click in user menu
    When I open header menu
    And I click on "Add new wallet" option
    Then I see onboarding main screen within modal over the active Lace page in expanded view

  @LW-9335
  Scenario: Popup-view - Multi-wallet - "Add new wallet" option click in user menu
    When I navigate to home page on popup view
    And I open header menu
    And I click on "Add new wallet" option
    And I switch to last window
    Then I see onboarding main screen within modal over the active Lace page in expanded view

  @LW-9336
  Scenario: Extended-view - Multi-wallet - Create - Create button click
    When I opened "Create" flow via "Add new wallet" feature
    Then "Mnemonic writedown" page is displayed with 24 words
    And "Recovery phrase" step is marked as active on progress timeline
    And "Next" button is enabled during onboarding process

  @LW-9344
  Scenario: Extended-view - Multi-wallet - Create - "Start by saving your recovery phrase" page - open/close "Keeping your wallet secure" modal
    Given I opened "Create" flow via "Add new wallet" feature
    When I click on "Watch video" link on "Mnemonic writedown" page
    Then I see "Watch video" modal
    When I click "Got it" link in "Keeping your wallet secure" modal
    Then "Mnemonic writedown" page is displayed with 24 words

  @LW-9347
  Scenario: Extended-view - Multi-wallet - Create - "Start by saving your recovery phrase" page - Back button click
    Given I opened "Create" flow via "Add new wallet" feature
    When I click "Back" button during wallet setup
    Then I see onboarding main screen within modal over the active Lace page in expanded view

  @LW-9348
  Scenario: Extended-view - Multi-wallet - Create - "Enter your recovery phrase" page - Back button click
    Given I opened "Create" flow via "Add new wallet" feature
    When I click "Next" button during wallet setup
    And I click "Back" button during wallet setup
    Then I see "Are you sure you want to start again?" modal

  @LW-9349
  Scenario: Extended-view - Multi-wallet - Create - "Enter your recovery phrase" page - Back button click - "Are you sure you want to start again?" modal - cancel
    Given I opened "Create" flow via "Add new wallet" feature
    When I click "Next" button during wallet setup
    And I click "Back" button during wallet setup
    Then I see "Are you sure you want to start again?" modal
    When I click "Cancel" button on "Are you sure you want to start again?" modal
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words

  @LW-9350
  Scenario: Extended-view - Multi-wallet - Create - "Enter your recovery phrase" page - Back button click - "Are you sure you want to start again?" modal - confirm
    Given I opened "Create" flow via "Add new wallet" feature
    When I click "Next" button during wallet setup
    And I click "Back" button during wallet setup
    Then I see "Are you sure you want to start again?" modal
    When I click "OK" button on "Are you sure you want to start again?" modal
    Then "Mnemonic writedown" page is displayed with 24 words

  @LW-9351
  Scenario: Extended-view - Multi-wallet - Create - "Start by saving your recovery phrase" page - "Keeping your wallet secure" modal - "Read more" link click
    Given I opened "Create" flow via "Add new wallet" feature
    When I click on "Watch video" link on "Mnemonic writedown" page
    Then I see "Watch video" modal
    When I click "Read More" link in modal
    Then I see a "FAQ" article with title "What is my recovery phrase?"

  @LW-9352
  Scenario: Extended-view - Multi-wallet - Create - "Enter your recovery phrase" page
    Given I opened "Create" flow via "Add new wallet" feature
    When I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    And "Recovery phrase" step is marked as active on progress timeline
    And "Next" button is disabled during onboarding process

  @LW-9353
  Scenario: Extended-view - Multi-wallet - Create - "Enter your recovery phrase" page - Mnemonic fill - paste from clipboard
    Given I opened "Create" flow via "Add new wallet" feature
    When I click on "Copy to clipboard" button
    And I click "Next" button during wallet setup
    And I click on "Paste from clipboard" button
    Then I do not see incorrect passphrase error displayed
    And "Next" button is enabled during onboarding process

  @LW-9354
  Scenario: Extended-view - Multi-wallet - Create - "Enter your recovery phrase" page - Mnemonic fill - enter correct mnemonic
    Given I opened "Create" flow via "Add new wallet" feature
    When I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    Then "Next" button is enabled during onboarding process
