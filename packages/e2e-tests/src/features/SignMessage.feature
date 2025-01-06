@SignMessage-Extended @Testnet
Feature: Sign message

  Background:
    Given Wallet is synced

  @LW-11536
  Scenario: Extended view - Sign message - open "Message signing" drawer
    When I click the menu button
    And I click on the "Sign message" option
    Then "Message signing" drawer is displayed

  @LW-11537
  Scenario: Extended view - Sign message - main account - show available addresses
    When I click the menu button
    And I click on the "Sign message" option
    And I click on "Select an address to use" button
    Then the list of all available addresses is shown and contains:
      # For main account from TestAutomationWallet
      | addr_test1qzkk4azpmv8etfx5tfq...x70z2nqqd80frq |
      | addr_test1qqtwywurxyzpaj47fk2...x70z2nqqae5w3z |
      | addr_test1qpxaz0jx5alxye49lr3...x70z2nqqwxwg6w |
      | addr_test1qrn7uuaeq0un44ju0qy...x70z2nqq5c6lqf |
      | addr_test1qpuggh7wq0tk3fl9tnq...x70z2nqqux74rq |
      | addr_test1qz0qskuhrc7nsxy5zwr...x70z2nqqcn9rdy |
      | addr_test1qqre74yrw27swrn4eff...x70z2nqqv47pa5 |
      | addr_test1qz5ne6jq3kk4xdqre7a...x70z2nqqfajtmc |
      | addr_test1qrtl6kgv2qu7cdwcrdk...x70z2nqqv2me65 |
      | addr_test1qpqr8rep53qt3xpv82h...x70z2nqqmlc0y9 |
      | addr_test1qqhdt5xfdp5gj63pyd0...x70z2nqqdwgxev |
      | addr_test1qze50x9ayxq8c97qh27...x70z2nqq3rngdu |

  @LW-11538
  Scenario: Extended view - Sign message - additional account - show available addresses
    Given One of additional accounts is active
    When I click the menu button
    And I click on the "Sign message" option
    And I click on "Select an address to use" button
    Then the list of all available addresses is shown and contains:
      # For 3rd account from TestAutomationWallet
      | addr_test1qzcsy9ulqjfjyga36yt...q8x8u84q58umw7 |

  @LW-11539 @Smoke
  Scenario: Extended view - Sign message - happy path
    When I click the menu button
    And I click on the "Sign message" option
    And I click on "Select an address to use" button
    And I select a random address from the list
    Then selected address is displayed on a drawer
    When I fill "Message to sign" field
    And I click on "Sign message" button
    Then "Sign confirmation" drawer is displayed
    When I fill password input with correct password
    And I click on "Sign message" button
    Then "All done" drawer is displayed for message signing flow
    When I click on "Copy signature to clipboard" button
    Then I see a toast with text: "Copied to clipboard"
    And signature in clipboard is equal to the one displayed on drawer
    When I click on "Close" button on "All done!" drawer for message signing
    Then Drawer is not displayed
