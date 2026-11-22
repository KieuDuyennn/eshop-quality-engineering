*** Settings ***
Documentation    Shared settings for the API suite: where the backend answers, request
...              and start-up timeouts, and the accounts the tests log in with.


*** Variables ***
${API_URL}                   http://localhost:3000
${REQUEST_TIMEOUT}           ${10}
${BACKEND_START_TIMEOUT}     30 s
${BACKEND_POLL_INTERVAL}     1 s
&{NO_AUTH}                   &{EMPTY}

${ADMIN_EMAIL}               admin@eshop.com
${ADMIN_PASSWORD}            Admin123!
${NEW_USER_PASSWORD}         Robot1234!

${DEFAULT_ORDER_TOTAL}       ${1000000}
${OTHER_USER_ORDER_TOTAL}    ${2000000}
${SHIPPING_ADDRESS}          227 Nguyen Van Cu, Q5, TP.HCM
