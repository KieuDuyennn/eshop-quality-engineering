*** Settings ***
Documentation       FR-01 account registration through the API. The FR01 cases are the
...                 level=api rows of e2e/automation/data/fr01_registration.csv.

Resource            ../resources/api.resource

Test Template       Register Request Should Get The Designed Answer

Test Tags           fr01


*** Test Cases ***
FR01-TC-01b Valid Registration Creates A Usable Account
    [Documentation]    A valid name, email and password answer 200 with an id, and the account
    ...    logs in with the same name and email. FR01-TC-01b, REQ-16 EC-27.
    [Tags]    smoke
    FR01-TC-01b

FR01-TC-03 Missing Name Key Is Rejected
    [Documentation]    A register body without the name key answers 400. FR01-TC-03, EC-29.
    [Tags]    regression    known-bug
    FR01-TC-03

FR01-TC-05 Missing Email Key Is Rejected
    [Documentation]    A register body without the email key answers 400. FR01-TC-05, EC-29.
    [Tags]    regression    known-bug
    FR01-TC-05

FR01-TC-11 Missing Password Key Is Rejected
    [Documentation]    A register body without the password key answers 400. FR01-TC-11, EC-29.
    [Tags]    regression    known-bug
    FR01-TC-11

FR01-API-01 Empty Name Is Rejected
    [Documentation]    An empty name answers 400 and creates no account. FR01-API-01, EC-29.
    [Tags]    regression    known-bug
    FR01-API-01

FR01-API-02 Empty Email Is Rejected
    [Documentation]    An empty email answers 400 and creates no account. FR01-API-02, EC-29.
    [Tags]    regression    known-bug
    FR01-API-02

FR01-API-03 Empty Password Is Rejected
    [Documentation]    An empty password answers 400 and creates no account. FR01-API-03, EC-29.
    [Tags]    regression    known-bug
    FR01-API-03

FR01-API-04 Email Without At Sign Is Rejected
    [Documentation]    An email with no at sign answers 400 and creates no account.
    ...    FR01-API-04, EC-30.
    [Tags]    regression    known-bug
    FR01-API-04

FR01-API-05 Email Without Domain Is Rejected
    [Documentation]    An email with no domain part answers 400 and creates no account.
    ...    FR01-API-05, EC-30.
    [Tags]    regression    known-bug
    FR01-API-05

FR01-API-06 Email Without Local Part Is Rejected
    [Documentation]    An email with no local part answers 400 and creates no account.
    ...    FR01-API-06, EC-30.
    [Tags]    regression    known-bug
    FR01-API-06

FR01-API-07 Seven Character Password Is Rejected
    [Documentation]    A password one character below the minimum length answers 400.
    ...    FR01-API-07, EC-32.
    [Tags]    regression    known-bug
    FR01-API-07

FR01-API-08 Password Without Uppercase Is Rejected
    [Documentation]    A password with no uppercase letter answers 400. FR01-API-08, EC-32.
    [Tags]    regression    known-bug
    FR01-API-08

FR01-API-09 Password Without Lowercase Is Rejected
    [Documentation]    A password with no lowercase letter answers 400. FR01-API-09, EC-32.
    [Tags]    regression    known-bug
    FR01-API-09

FR01-API-10 Password Without Digit Is Rejected
    [Documentation]    A password with no digit answers 400. FR01-API-10, EC-32.
    [Tags]    regression    known-bug
    FR01-API-10

FR01-API-11 Password Without Special Character Is Rejected
    [Documentation]    A password with no special character answers 400. FR01-API-11, EC-32.
    [Tags]    regression    known-bug
    FR01-API-11

FR01-API-12 Duplicate Email Is Rejected
    [Documentation]    Registering an email that already has an account answers 400.
    ...    FR01-API-12, EC-31.
    [Tags]    regression    known-bug
    FR01-API-12


*** Keywords ***
Register Request Should Get The Designed Answer
    [Documentation]    Sends the register request of CSV row ``tc_id`` and checks the status,
    ...    the body and whether the account can log in afterwards.
    [Arguments]    ${tc_id}
    ${case}=    Load Registration Case    ${tc_id}
    IF    $case['existing_account']
        Register Account That Already Exists    ${case}[existing_account]
    END
    ${response}=    Register Account    ${case}[body]
    IF    $case['expect_success']
        Account Should Be Created    ${response}    ${case}    ${tc_id}
    ELSE
        Run Keyword And Continue On Failure
        ...    Status Should Be    ${response}    ${case}[expected_status]    ${tc_id} register status
        Run Keyword And Continue On Failure    Response Should Not Return Account Id    ${response}    ${tc_id}
        IF    $case['login_probe']
            Account Should Not Log In    ${case}[body]    ${tc_id}
        END
    END

Register Account That Already Exists
    [Documentation]    Creates the account a duplicate-email case collides with.
    [Arguments]    ${body}
    ${response}=    Register Account    ${body}
    Status Should Be    ${response}    200    setup register the existing account

Account Should Be Created
    [Documentation]    Checks the register answer carries an id and the account logs in with
    ...    the name and email that were sent.
    [Arguments]    ${response}    ${case}    ${tc_id}
    Status Should Be    ${response}    ${case}[expected_status]    ${tc_id} register status
    ${account_id}=    Evaluate    $response.json().get('id')
    IF    not isinstance($account_id, int)
        Fail    ${tc_id} register response: expected a numeric account id, answered ${account_id}
    END
    ${login}=    Log In    ${case}[body]
    Status Should Be    ${login}    200    ${tc_id} login with the new account
    ${stored_email}=    Evaluate    $login.json()['user']['email']
    ${stored_name}=    Evaluate    $login.json()['user']['name']
    Should Be Equal    ${stored_email}    ${case}[body][email]
    ...    ${tc_id} stored email: expected ${case}[body][email], answered ${stored_email}    values=False
    Should Be Equal    ${stored_name}    ${case}[body][name]
    ...    ${tc_id} stored name: expected ${case}[body][name], answered ${stored_name}    values=False

Response Should Not Return Account Id
    [Documentation]    A refused registration must not claim an account was created.
    [Arguments]    ${response}    ${tc_id}
    ${account_id}=    Evaluate    $response.json().get('id')
    IF    $account_id is not None
        Fail    ${tc_id} register response: a refused request must not return an account id, answered ${account_id}
    END

Account Should Not Log In
    [Documentation]    A refused registration must not have written an account that logs in.
    [Arguments]    ${body}    ${tc_id}
    ${response}=    Log In    ${body}
    IF    $response.status_code == 200
        Fail    ${tc_id} login probe: the refused account ${body}[email] still logs in
    END
