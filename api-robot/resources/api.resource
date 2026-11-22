*** Settings ***
Documentation       Session, request and assertion keywords for the EShop API.
...
...                 Every request goes through `Send Request`, which raises the log level
...                 while RequestsLibrary sends it, so headers and bodies stay out of the
...                 log. Every status check goes through `Status Should Be Among`, which
...                 fails with ``<label>: expected <status>, answered <status>``.

Library             RequestsLibrary
Resource            variables.resource
Library             ../libraries/EshopApi.py    api_url=${API_URL}


*** Keywords ***
Open API Session
    [Documentation]    Opens the ``eshop`` session on ``\${API_URL}`` that every request uses.
    Create Session    eshop    ${API_URL}

Send Request
    [Documentation]    Sends ``method`` to ``path`` with the ``auth`` headers and the ``json``
    ...    body and returns the response whatever its status, so the caller asserts the
    ...    status itself. RequestsLibrary logs headers and bodies at INFO, and they hold
    ...    tokens and passwords, so the log level is WARN while it runs.
    [Arguments]    ${method}    ${path}    ${auth}=${NO_AUTH}    ${json}=${None}
    ${previous_level}=    Set Log Level    WARN
    TRY
        ${response}=    Run Keyword    ${method} On Session    eshop    ${path}
        ...    headers=${auth}    json=${json}    expected_status=anything    timeout=${REQUEST_TIMEOUT}
    FINALLY
        Set Log Level    ${previous_level}
    END
    Log    ${method} ${path} answered ${response.status_code}
    RETURN    ${response}

Status Should Be Among
    [Documentation]    Fails with ``<label>: expected <statuses>, answered <status>`` when the
    ...    response status is not in ``allowed_statuses``, after logging the method, URL,
    ...    status and body with passwords and tokens hidden.
    [Arguments]    ${response}    ${allowed_statuses}    ${label}
    IF    $response.status_code in $allowed_statuses    RETURN
    ${expected}=    Evaluate
    ...    str($allowed_statuses[0]) if len($allowed_statuses) == 1 else f"one of {list($allowed_statuses)}"
    ${details}=    Describe Response    ${response}
    Log    ${details}
    Fail    ${label}: expected ${expected}, answered ${response.status_code}

Status Should Be
    [Documentation]    Same as `Status Should Be Among` for a single expected status.
    [Arguments]    ${response}    ${expected_status: int}    ${label}
    VAR    @{allowed_statuses}=    ${expected_status}
    Status Should Be Among    ${response}    ${allowed_statuses}    ${label}

Get Products
    [Documentation]    Requests the product list without a token.
    ${response}=    Send Request    GET    /api/products
    RETURN    ${response}
