@AddNewWalletRestore @Testnet @Mainnet
Feature: Add new wallet - Restore wallet

  Background:
    Given Lace is ready for test

  @LW-9368
  Scenario: Extended-view - Multi-wallet - Restore - Restore button click
    When I opened "Restore" flow via "Add new wallet" feature
    Then "Choose a recovery method" page is displayed in modal
    And "Recovery method" step is marked as active on progress timeline
    And "Next" button is enabled during onboarding process

  @LW-9381
  Scenario: Extended-view - Multi-wallet - Restore - "Enter your recovery phrase" page - Back button click
    Given I opened "Restore" flow via "Add new wallet" feature
    And I click "Next" button during wallet setup
    When I click "Back" button during wallet setup
    Then "Choose a recovery method" page is displayed in modal

  @LW-9383
  Scenario: Extended-view - Multi-wallet - Restore - "Enter your recovery phrase" page - Mnemonic fill - paste from clipboard
    Given I saved test mnemonic for "AddNewWallet" to clipboard
    And I opened "Restore" flow via "Add new wallet" feature
    And I click "Next" button during wallet setup
    When I click on "Paste from clipboard" button
    Then I do not see incorrect passphrase error displayed
    And "Next" button is enabled during onboarding process

  @LW-9384
  Scenario Outline: Extended-view - Multi-wallet - Restore - "Enter your recovery phrase" page - <mnemonicLength>-word mnemonic - invalid word
    Given I opened "Restore" flow via "Add new wallet" feature
    And I click "Next" button during wallet setup
    When I select <mnemonicLength> word passphrase length
    And I enter <mnemonicLength> correct mnemonic words on "Mnemonic verification" page
    And I change one random field
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    Examples:
      | mnemonicLength |
      | 12             |
      | 15             |
      | 24             |

  @LW-9385
  Scenario Outline: Extended-view - Multi-wallet - Restore - "Enter your recovery phrase" page - <mnemonicLength>-word mnemonic - invalid all words
    Given I opened "Restore" flow via "Add new wallet" feature
    And I click "Next" button during wallet setup
    When I select <mnemonicLength> word passphrase length
    And I enter <mnemonicLength> incorrect mnemonic words on "Mnemonic verification" page
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    Examples:
      | mnemonicLength |
      | 12             |
      | 15             |
      | 24             |

  @LW-9369
  Scenario: Extended-view - Multi-wallet - Restore - "Let's set up your new wallet" page - Back button click
    Given I opened "Restore" flow via "Add new wallet" feature
    When I go to "Mnemonic verification" page from "Restore" wallet flow and fill values
    And I click "Next" button during wallet setup
    Then "Wallet setup" page is displayed in modal
    And "Wallet setup" step is marked as active on progress timeline
    When I click "Back" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words

  @LW-9370
  Scenario: Extended-view - Multi-wallet - Restore - "Let's set up your new wallet" page - Password confirmation input appearing
    Given I opened "Restore" flow via "Add new wallet" feature
    When I go to "Mnemonic verification" page from "Restore" wallet flow and fill values
    And I click "Next" button during wallet setup
    Then empty password confirmation input is not displayed
    When I enter wallet password "N_8J@bne87A"
    Then empty password confirmation input is displayed

  @LW-9371
  Scenario: Extended-view - Multi-wallet - Restore - "Let's set up your new wallet" page - Too long name
    Given I opened "Restore" flow via "Add new wallet" feature
    When I go to "Wallet setup" page from "Restore" wallet flow and fill values
    And I enter wallet name with size of: 21 characters
    Then wallet name error "core.walletSetupRegisterStep.nameMaxLength" is displayed
    And "Next" button is disabled during onboarding process

  @LW-9372 @LW-9373
  Scenario Outline: Extended-view - Multi-wallet - Restore - "Let's set up your new wallet" page - Recommendation for password: <passw_err>, password: <password>, password confirmation: <password_conf>
    Given I opened "Restore" flow via "Add new wallet" feature
    When I go to "Wallet setup" page from "Restore" wallet flow
    And I enter wallet name: "wallet", password: "<password>" and password confirmation: "<password_conf>"
    Then Password recommendation: "<passw_err>", complexity bar level: "<complex_bar_lvl>" and password confirmation error: "<passw_conf_err>" are displayed
    Examples:
      | password    | password_conf | passw_err                                                               | complex_bar_lvl | passw_conf_err                               |
      | a           |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | P@ss        |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | N_8J@bne    |               | core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback | 2               | empty                                        |
      | N_8J@bne87  |               | empty                                                                   | 3               | empty                                        |
      | N_8J@bne87A | N_8J@bne87    | empty                                                                   | 4               | core.walletSetupRegisterStep.noMatchPassword |

  @LW-9374
  Scenario: Extended-view - Multi-wallet - Restore - "Let's set up your new wallet" page - Password show/hide button
    Given I opened "Restore" flow via "Add new wallet" feature
    When I go to "Wallet setup" page from "Restore" wallet flow and fill values
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

  @LW-9386 @LW-9375
  Scenario Outline: Extended-view - Multi-wallet - Restore - <mnemonicLength>-word mnemonic - happy path
    Given I opened "Restore" flow via "Add new wallet" feature
    And I click "Next" button during wallet setup
    When I select <mnemonicLength> word passphrase length
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with <mnemonicLength> words
    When I enter <mnemonicLength> correct mnemonic words on "Mnemonic verification" page
    And I click "Next" button during wallet setup
    When I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    Then "Enter wallet" button is enabled
    When I click "Enter wallet" button
    Then I see LW homepage
    And "ValidName" is displayed as a wallet name on the menu button
    When I click the menu button
    Then Wallet number 2 with "ValidName" name is displayed on the user menu
    Examples:
      | mnemonicLength |
      | 12             |
      | 15             |
      | 24             |

  @LW-9245
  Scenario Outline: Extended-view - Multi-wallet - Restore - "<page>" page without any user input interaction - <action>
    Given I opened "Restore" flow via "Add new wallet" feature
    When I go to "<page>" page from "Restore" wallet flow and not fill values
    And <action>
    Then "Are you sure you want to cancel adding a new wallet?" dialog is not displayed
    And "Add new wallet" modal is not displayed
    Examples:
      | page                  | action                                       |
      | Mnemonic verification | I click "X" button on "Add new wallet" modal |
#      | Mnemonic verification | I click outside "Add new wallet" modal       | BUG: LW-10975

  @LW-9246
  Scenario Outline: Extended-view - Multi-wallet - Restore - "<page>" page with any user input interaction - <action>
    Given I opened "Restore" flow via "Add new wallet" feature
    When I go to "<page>" page from "Restore" wallet flow and fill values
    And <action>
    Then "Are you sure you want to cancel adding a new wallet?" dialog is displayed
    Examples:
      | page                  | action                                       |
      | Mnemonic verification | I click "X" button on "Add new wallet" modal |
#      | Mnemonic verification | I click outside "Add new wallet" modal       | BUG: LW-10975
      | Wallet setup          | I click "X" button on "Add new wallet" modal |
#      | Wallet setup          | I click outside "Add new wallet" modal       | BUG: LW-10975

  @LW-9247
  Scenario Outline: Extended-view - Multi-wallet - Restore - "Add new wallet" - <page> - "Are you sure you want to cancel adding a new wallet?" dialog - go back
    Given I opened "Restore" flow via "Add new wallet" feature
    When I go to "<page>" page from "Restore" wallet flow and fill values
    And I click "X" button on "Add new wallet" modal
    And I click "Go back" button on "Are you sure you want to cancel adding a new wallet?" dialog
    Then "Are you sure you want to cancel adding a new wallet?" dialog is not displayed
    And <step>
    Examples:
      | page                  | step                                                                               |
      | Mnemonic verification | "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words |
      | Wallet setup          | "Wallet setup" page is displayed in modal                                          |

  @LW-9248
  Scenario Outline: Extended-view - Multi-wallet - Restore - "Add new wallet" - <page> - "Are you sure you want to cancel adding a new wallet?" dialog - proceed
    Given I opened "Restore" flow via "Add new wallet" feature
    When I go to "<page>" page from "Restore" wallet flow and fill values
    And I click "X" button on "Add new wallet" modal
    And I click "Proceed" button on "Are you sure you want to cancel adding a new wallet?" dialog
    Then "Are you sure you want to cancel adding a new wallet?" dialog is not displayed
    And "Add new wallet" modal is not displayed
    Examples:
      | page                  |
      | Mnemonic verification |
      | Wallet setup          |
