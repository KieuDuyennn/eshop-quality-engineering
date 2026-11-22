*** Settings ***
Documentation     Starts the EShop backend once for the whole run and stops it at the end.
...
...               database.js drops and re-seeds every table on start, so each run begins
...               from a clean database. LOADTEST=1 turns off the 200 requests per 15
...               minutes limiter, which a full run would hit; no test here exercises it.

Library           OperatingSystem
Library           Process
Resource          ../resources/api.resource

Suite Setup       Start Backend
Suite Teardown    Terminate All Processes


*** Variables ***
${BACKEND_DIR}    ${CURDIR}${/}..${/}..${/}sut${/}backend
${RESULTS_DIR}    ${CURDIR}${/}..${/}results
${BACKEND_LOG}    ${RESULTS_DIR}${/}backend.log


*** Keywords ***
Start Backend
    [Documentation]    Starts ``node server.js`` with LOADTEST=1, waits until it answers and
    ...    opens the API session.
    API Port Should Be Free
    Create Directory    ${RESULTS_DIR}
    Start Process
    ...    node
    ...    server.js
    ...    cwd=${BACKEND_DIR}
    ...    env:LOADTEST=1
    ...    stdout=${BACKEND_LOG}
    ...    stderr=STDOUT
    ...    alias=backend
    TRY
        Wait Until Keyword Succeeds
        ...    ${BACKEND_START_TIMEOUT}
        ...    ${BACKEND_POLL_INTERVAL}
        ...    Backend Should Answer
    EXCEPT
        ${log}=    Get File    ${BACKEND_LOG}
        ${last_lines}=    Evaluate    "\\n".join($log.splitlines()[-20:])
        Fail    backend did not answer within ${BACKEND_START_TIMEOUT}, last lines of backend.log:\n${last_lines}
    END
    Open API Session

Backend Should Answer
    [Documentation]    Passes when ``GET /api/products`` answers 200.
    ${response}=    GET    ${API_URL}/api/products    expected_status=anything    timeout=${REQUEST_TIMEOUT}
    Should Be Equal As Integers    ${response.status_code}    200
