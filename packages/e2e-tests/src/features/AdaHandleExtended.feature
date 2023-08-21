@AdaHandle-extended @Testnet
Feature: ADA handle - extended view

  @LW-7331
  Scenario: Extended view - Add a valid ADA handle to the address book
    Given I am on Address Book extended page
    And I click "Add address" button on address book page
    When I fill address form with "test_handle_1" name
    And I fill address form with "$test_handle_1" ADA handle
    Then Green tick icon is displayed next to ADA handle
    And "Save address" button is enabled on "Add new address" drawer
    When I click "Save address" button on "Add new address" drawer
    Then I see a toast with message: "browserView.addressBook.toast.addAddress"
    And I see address row with name "test_handle_1" and address "$test_handle_1" on the list in extended mode

  @LW-7333
  Scenario: Extended view - Add an invalid ADA handle to the address book
    Given I am on Address Book extended page
    And I click "Add address" button on address book page
    When I fill address form with "ADA handle" name
    And I fill address form with "$fake_handle" ADA handle
    Then Red "X" icon is displayed next to ADA handle
    And "Handle not found" error is displayed
    And "Save address" button is disabled on "Add new address" drawer

  @LW-7335
  Scenario: Extended view - Edit an ADA handle from the address book
    Given I have 2 addresses with ADA handle in my address book in extended mode
    And I click address on the list with name "Ada Handle 1"
    And I see address detail page in extended mode with details of "Ada Handle 1" address
    And I click "Edit" button on address details page
    And I see "Edit address" drawer in extended mode with details of "Ada Handle 1" address
    When I fill address form with "AH 1 edited" name and "$test_handle_3" address
    Then Green tick icon is displayed next to ADA handle
    And I click "Done" button on "Edit address" drawer
    And I see a toast with message: "browserView.addressBook.toast.editAddress"
    And I see address row with name "AH 1 edited" and address "$test_handle_3" on the list in extended mode

  @LW-7337
  Scenario: Extended view - Edit an ADA handle from the address book with an invalid handle
    Given I have 2 addresses with ADA handle in my address book in extended mode
    And I click address on the list with name "Ada Handle 1"
    And I click "Edit" button on address details page
    When I fill address form with "AH 1 edited" name and "$a3asd35" address
    Then Red "X" icon is displayed next to ADA handle
    And Contact "empty" name error and "Handle not found" address error are displayed
    And "Done" button is disabled on "Edit address" drawer

  @LW-7339
  Scenario: Extended view - Edit an ADA handle from the address book with a duplicated handle
    Given I have 2 addresses with ADA handle in my address book in extended mode
    And I click address on the list with name "Ada Handle 1"
    And I click "Edit" button on address details page
    When I fill address form with "AH 1 edited" name and "$test_handle_2" address
    Then Green tick icon is displayed next to ADA handle
    And I click "Done" button on "Edit address" drawer
    And I see a toast with message: "addressBook.errors.givenAddressAlreadyExist"
