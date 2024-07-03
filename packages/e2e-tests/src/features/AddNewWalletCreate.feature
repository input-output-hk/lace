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
    Given I opened "Create" flow via "Add new wallet" feature
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

  @LW-9355
  Scenario: Extended-view - Multi-wallet - Create - "Enter your recovery phrase" page - Mnemonic fill - invalid all words
    Given I opened "Create" flow via "Add new wallet" feature
    When I save mnemonic words
    And I click "Next" button during wallet setup
    And I fill passphrase fields using saved 24 words mnemonic in incorrect order
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    When I enter saved mnemonic words
    Then "Next" button is enabled during onboarding process

  @LW-9356
  Scenario: Extended-view - Multi-wallet - Create - "Enter your recovery phrase" page - Mnemonic fill - invalid word
    Given I opened "Create" flow via "Add new wallet" feature
    When I save mnemonic words
    When I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    And I change one random field
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    When I enter saved mnemonic words
    Then "Next" button is enabled during onboarding process

  @LW-9337
  Scenario: Extended-view - Multi-wallet - Create - "Let's set up your new wallet" page - Back button click
    Given I opened "Create" flow via "Add new wallet" feature
    When I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    And I click "Next" button during wallet setup
    Then "Wallet setup" page is displayed in modal
    And "Wallet setup" step is marked as active on progress timeline
    When I click "Back" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words

  @LW-9338
  Scenario: Extended-view - Multi-wallet - Create - "Let's set up your new wallet" page - Password confirmation input appearing
    Given I opened "Create" flow via "Add new wallet" feature
    When I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    And I click "Next" button during wallet setup
    Then empty password confirmation input is not displayed
    When I enter wallet password "N_8J@bne87A"
    Then empty password confirmation input is displayed

  @LW-9339
  Scenario: Extended-view - Multi-wallet - Create - "Let's set up your new wallet" page - Too long name
    Given I opened "Create" flow via "Add new wallet" feature
    When I go to "Wallet setup" page from "Create" wallet flow and fill values
    And I enter wallet name with size of: 21 characters
    Then wallet name error "core.walletSetupRegisterStep.nameMaxLength" is displayed
    And "Next" button is disabled during onboarding process

  @LW-9340 @LW-9341
  Scenario Outline: Extended-view - Multi-wallet - Create - "Let's set up your new wallet" page - Recommendation for password: <passw_err>, password: <password>, password confirmation: <password_conf>
    Given I opened "Create" flow via "Add new wallet" feature
    When I go to "Wallet setup" page from "Create" wallet flow
    And I enter wallet name: "wallet", password: "<password>" and password confirmation: "<password_conf>"
    Then Password recommendation: "<passw_err>", complexity bar level: "<complex_bar_lvl>" and password confirmation error: "<passw_conf_err>" are displayed
    Examples:
      | password    | password_conf | passw_err                                                               | complex_bar_lvl | passw_conf_err                               |
      | a           |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | P@ss        |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | N_8J@bne    |               | core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback | 2               | empty                                        |
      | N_8J@bne87  |               | empty                                                                   | 3               | empty                                        |
      | N_8J@bne87A | N_8J@bne87    | empty                                                                   | 4               | core.walletSetupRegisterStep.noMatchPassword |

  @LW-9342
  Scenario: Extended-view - Multi-wallet - Create - "Let's set up your new wallet" page - Password show/hide button
    Given I opened "Create" flow via "Add new wallet" feature
    When I go to "Wallet setup" page from "Create" wallet flow and fill values
    Then password value is hidden for "Password" input field
    And password value is hidden for "Confirm password" input field
    And I click on "Show password" for "Password" input field
    And I click on "Show password" for "Confirm password" input field
    Then password value is visible for "Password" input field
    Then password value is visible for "Confirm password" input field
    When I click on "Hide password" for "Password" input field
    And I click on "Hide password" for "Confirm password" input field
    Then password value is hidden for "Password" input field
    And password value is hidden for "Confirm password" input field

