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

Register Account
    [Documentation]    Sends ``body`` to ``POST /api/register`` and returns the response.
    [Arguments]    ${body}
    ${response}=    Send Request    POST    /api/register    json=${body}
    RETURN    ${response}

Log In
    [Documentation]    Sends ``credentials`` to ``POST /api/login`` and returns the response.
    [Arguments]    ${credentials}
    ${response}=    Send Request    POST    /api/login    json=${credentials}
    RETURN    ${response}

Register New User
    [Documentation]    Registers an account with a unique ``rf.<test-id>.<timestamp>`` email
    ...    and returns its credentials.
    ${email}=    Unique Email
    ${user}=    New User Credentials    ${email}    RF User
    ${response}=    Register Account    ${user}
    Status Should Be    ${response}    200    setup register ${email}
    RETURN    ${user}

Log In As
    [Documentation]    Logs in with ``credentials`` and returns the auth header for later
    ...    requests.
    [Arguments]    ${credentials}
    ${response}=    Log In    ${credentials}
    Status Should Be    ${response}    200    setup login ${credentials}[email]
    ${auth}=    Auth Header From Login    ${response}
    RETURN    ${auth}

Register And Log In New User
    [Documentation]    Registers a new user and returns its auth header.
    ${user}=    Register New User
    ${auth}=    Log In As    ${user}
    RETURN    ${auth}

Log In As Admin
    [Documentation]    Logs in as the seeded admin and stores the auth header in the suite
    ...    variable ``\${ADMIN_AUTH}``, which `Walk Order To Status` uses.
    ${admin}=    Admin Credentials
    ${auth}=    Log In As    ${admin}
    VAR    ${ADMIN_AUTH}=    ${auth}    scope=SUITE

Check Out As
    [Documentation]    Sends ``POST /api/checkout`` with ``total_amount`` exactly as given and
    ...    returns the response.
    [Arguments]    ${auth}    ${total_amount}
    VAR    &{body}=    total_amount=${total_amount}    shipping_address=${SHIPPING_ADDRESS}
    ${response}=    Send Request    POST    /api/checkout    ${auth}    json=${body}
    RETURN    ${response}

Place Order As
    [Documentation]    Creates a pending order for ``auth`` and returns its id.
    [Arguments]    ${auth}    ${total_amount}=${DEFAULT_ORDER_TOTAL}
    ${response}=    Check Out As    ${auth}    ${total_amount}
    Status Should Be    ${response}    200    setup checkout
    RETURN    ${response.json()}[orderId]

Set Order Status As
    [Documentation]    Sends ``PUT /api/admin/orders/<id>/status`` with ``status`` and returns
    ...    the response.
    [Arguments]    ${auth}    ${order_id}    ${status}
    VAR    &{body}=    status=${status}
    ${response}=    Send Request    PUT    /api/admin/orders/${order_id}/status    ${auth}    json=${body}
    RETURN    ${response}

Walk Order To Status
    [Documentation]    Moves a pending order to ``target_status`` through the admin endpoint,
    ...    one allowed transition at a time, as ``\${ADMIN_AUTH}``.
    [Arguments]    ${order_id}    ${target_status}
    ${steps}=    Status Steps To    ${target_status}
    FOR    ${step}    IN    @{steps}
        ${response}=    Set Order Status As    ${ADMIN_AUTH}    ${order_id}    ${step}
        Status Should Be    ${response}    200    setup move order ${order_id} to ${step}
    END

Place Order In Status
    [Documentation]    Creates an order for ``auth``, walks it to ``status`` and returns its id.
    [Arguments]    ${auth}    ${status}    ${total_amount}=${DEFAULT_ORDER_TOTAL}
    ${order_id}=    Place Order As    ${auth}    ${total_amount}
    Walk Order To Status    ${order_id}    ${status}
    RETURN    ${order_id}

Get My Orders As
    [Documentation]    Requests ``GET /api/orders/my-orders`` and returns the response.
    [Arguments]    ${auth}
    ${response}=    Send Request    GET    /api/orders/my-orders    ${auth}
    RETURN    ${response}

Order Status Seen By Owner
    [Documentation]    Returns the status of ``order_id`` as its owner reads it from
    ...    ``GET /api/orders/my-orders``.
    [Arguments]    ${owner_auth}    ${order_id}
    ${response}=    Get My Orders As    ${owner_auth}
    Status Should Be    ${response}    200    read back my orders
    ${order}=    Find Order    ${response.json()}    ${order_id}
    IF    $order is None
        Fail    read back: order ${order_id} is not visible to its owner, so the check cannot run
    END
    RETURN    ${order}[status]

Order Should Hold Status
    [Documentation]    Fails unless ``order_id`` reads back with ``expected_status`` for its
    ...    owner.
    [Arguments]    ${owner_auth}    ${order_id}    ${expected_status}    ${label}=read back
    ${status}=    Order Status Seen By Owner    ${owner_auth}    ${order_id}
    IF    $status != $expected_status
        Fail    ${label}: order ${order_id} holds ${status}, expected ${expected_status}
    END
