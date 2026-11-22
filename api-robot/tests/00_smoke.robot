*** Settings ***
Documentation       Checks that the backend serves its product list before the feature
...                 suites run.

Library             RequestsLibrary


*** Variables ***
${API_URL}              http://localhost:3000
${REQUEST_TIMEOUT}      ${10}


*** Test Cases ***
RF-SMOKE-01 Product List Is Served
    [Documentation]    GET /api/products answers 200 with a non-empty list. New check, RF-SMOKE-01.
    [Tags]    smoke
    ${response}=    GET    ${API_URL}/api/products    expected_status=anything    timeout=${REQUEST_TIMEOUT}
    Should Be Equal As Integers    ${response.status_code}    200
    ...    product list: expected 200, answered ${response.status_code}    values=False
    Should Not Be Empty    ${response.json()}    product list: expected at least one product, answered an empty list
