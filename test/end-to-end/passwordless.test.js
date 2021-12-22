/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

/*
 * Imports
 */

/* https://github.com/babel/babel/issues/9849#issuecomment-487040428 */
import regeneratorRuntime from "regenerator-runtime";
import assert from "assert";
import puppeteer from "puppeteer";
import {
    clearBrowserCookiesWithoutAffectingConsole,
    setInputValues,
    waitForSTElement,
    waitFor,
    getFeatureFlags,
    waitForText,
} from "../helpers";

// Run the tests in a DOM environment.
require("jsdom-global")();
import { TEST_CLIENT_BASE_URL, TEST_SERVER_BASE_URL, TEST_APPLICATION_SERVER_BASE_URL } from "../constants";

// Using this temporarily instead of the helper, because we have multiple buttons in this form.
// Modifying the original breaks other tests...
async function submitForm(page) {
    const button = await waitForSTElement(page, "[data-supertokens='button'][type='submit']");
    return button.click();
}
/*
 * Tests.
 */
describe("SuperTokens Passwordless", function () {
    let browser;
    let page;
    let consoleLogs = [];

    const examplePhoneNumber = "+36701231212";
    const exampleEmail = "test@example.com";

    getTestCases("EMAIL", "email", exampleEmail);
    getTestCases("PHONE", "phoneNumber_text", examplePhoneNumber);

    before(async function () {
        const features = await getFeatureFlags();

        if (!features.includes("passwordless")) {
            this.skip();
        }
    });

    function getTestCases(contactMethod, inputName, contactInfo) {
        describe(`${contactMethod} + UserInputCode`, function () {
            before(async function () {
                ({ browser, page } = await initBrowser(contactMethod, consoleLogs));
                await setFlow(contactMethod, "USER_INPUT_CODE");
            });

            after(async function () {
                await browser.close();
                await fetch(`${TEST_SERVER_BASE_URL}/after`, {
                    method: "POST",
                }).catch(console.error);

                await fetch(`${TEST_SERVER_BASE_URL}/stop`, {
                    method: "POST",
                }).catch(console.error);
            });

            beforeEach(async function () {
                await clearBrowserCookiesWithoutAffectingConsole(page, consoleLogs);
                page.evaluate(() => localStorage.removeItem("supertokens-passwordless-loginAttemptInfo"));

                consoleLogs.length = 0;
            });

            it("Successful signin", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);
                await setInputValues(page, [{ name: "userInputCode", value: device.codes[0].userInputCode }]);
                await submitForm(page);

                await page.waitForSelector(".sessionInfo-user-id");

                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS SESSION ON_HANDLE_EVENT SESSION_CREATED",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SUCCESS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                ]);
            });

            it("Successful signin w/ redirectToPath", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth?redirectToPath=%2Fredirect-here`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);
                await setInputValues(page, [{ name: "userInputCode", value: device.codes[0].userInputCode }]);
                await submitForm(page);

                await page.waitForNavigation();

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/redirect-here");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS SESSION ON_HANDLE_EVENT SESSION_CREATED",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SUCCESS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                ]);
            });

            it("Submitting incorrect codes", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "input[name=userInputCode]");
                for (let i = 3; i > 0; i--) {
                    await setInputValues(page, [{ name: "userInputCode", value: "000000" }]);
                    await submitForm(page);

                    if (i === 1) {
                        await waitForSTElement(page, `input[name=${inputName}]`);
                        const error = await waitForSTElement(page, "[data-supertokens~='generalError']");
                        assert.deepStrictEqual(
                            await error.evaluate((e) => e.textContent),
                            `You entered the wrong OTP too many times. Please try again.`
                        );
                    } else {
                        const error = await waitForSTElement(page, "[data-supertokens~='inputErrorMessage']");
                        assert.deepStrictEqual(
                            await error.evaluate((e) => e.textContent),
                            `Invalid OTP. Attempts left: 0${i - 1}`
                        );
                    }
                }

                assert.deepStrictEqual(
                    [
                        "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                        "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                        "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                        "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                        "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                        "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_RESTART_FLOW",
                        "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    ],
                    consoleLogs
                );

                // We check that the error is cleared if we are editing the contact info
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await waitForSTElement(page, "[data-supertokens~='generalError']", true);
                await submitForm(page);
                // The error shouldn't reappear in the user input code screen either
                await waitForSTElement(page, "input[name=userInputCode]");
                await waitForSTElement(page, "[data-supertokens~='generalError']", true);
            });

            it("Submitting expired codes", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "input[name=userInputCode]");
                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);
                await waitFor(2500);
                for (let i = 3; i > 0; i--) {
                    await setInputValues(page, [{ name: "userInputCode", value: device.codes[0].userInputCode }]);
                    await submitForm(page);

                    if (i === 1) {
                        await waitForSTElement(page, `input[name=${inputName}]`);
                        const error = await waitForSTElement(page, "[data-supertokens~='generalError']");
                        assert.deepStrictEqual(
                            await error.evaluate((e) => e.textContent),
                            `You entered the wrong OTP too many times. Please try again.`
                        );
                    } else {
                        const error = await waitForSTElement(page, "[data-supertokens~='inputErrorMessage']");
                        assert.deepStrictEqual(
                            await error.evaluate((e) => e.textContent),
                            `Expired OTP. Attempts left: 0${i - 1}`
                        );
                    }
                }

                assert.deepStrictEqual(
                    [
                        "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                        "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                        "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                        "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                        "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                        "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_RESTART_FLOW",
                        "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    ],
                    consoleLogs
                );

                // We check that the error is cleared if we are editing the contact info
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await waitForSTElement(page, "[data-supertokens~='generalError']", true);
                await submitForm(page);
                // The error shouldn't reappear in the user input code screen either
                await waitForSTElement(page, "input[name=userInputCode]");
                await waitForSTElement(page, "[data-supertokens~='generalError']", true);
            });
        });

        describe(`${contactMethod} + Link`, function () {
            before(async function () {
                ({ browser, page } = await initBrowser(contactMethod, consoleLogs));
                await setFlow(contactMethod, "MAGIC_LINK");
            });

            after(async function () {
                await browser.close();
                await fetch(`${TEST_SERVER_BASE_URL}/after`, {
                    method: "POST",
                }).catch(console.error);

                await fetch(`${TEST_SERVER_BASE_URL}/stop`, {
                    method: "POST",
                }).catch(console.error);
            });

            beforeEach(async function () {
                await clearBrowserCookiesWithoutAffectingConsole(page, consoleLogs);
                page.evaluate(() => localStorage.removeItem("supertokens-passwordless-loginAttemptInfo"));

                consoleLogs.length = 0;
            });

            it("Successful signin", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=sendCodeIcon]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);
                await page.goto(device.codes[0].urlWithLinkCode);

                await page.waitForSelector(".sessionInfo-user-id");

                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS SESSION ON_HANDLE_EVENT SESSION_CREATED",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SUCCESS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                ]);
            });

            it("Successful signin w/ redirectToPath", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth?redirectToPath=%2Fredirect-here`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=sendCodeIcon]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);
                await page.goto(device.codes[0].urlWithLinkCode.replace("?", "?redirectToPath=%2Fredirect-here&"));
                await page.waitForNavigation({ waitUntil: "networkidle0" });

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/redirect-here");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS SESSION ON_HANDLE_EVENT SESSION_CREATED",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SUCCESS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                ]);
            });

            it("No linkCode", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth/verify`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/auth");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SIGN_IN_AND_UP",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                ]);
            });

            it("Bad linkCode", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth/verify?preAuthSessionId=asdf#asdfasfd`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/auth");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_RESTART_FLOW",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SIGN_IN_AND_UP",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                ]);
            });

            it("Bad preAuthSessionId good linkCode", async function () {
                const device = await setupDevice(page, inputName, contactInfo);
                consoleLogs.length = 0;

                await Promise.all([
                    page.goto(device.codes[0].urlWithLinkCode.replace(device.preAuthSessionId, "asdf")),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/auth");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SIGN_IN_AND_UP",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                ]);
            });

            it("Bad linkCode right preAuthSessionId", async function () {
                const device = await setupDevice(page, inputName, contactInfo);
                consoleLogs.length = 0;

                await Promise.all([
                    page.goto(device.codes[0].urlWithLinkCode.replace(/#.*/, "#asdf")),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/auth");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_RESTART_FLOW",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SIGN_IN_AND_UP",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                ]);
            });

            it("Missing preAuthSessionId", async function () {
                const device = await setupDevice(page, inputName, contactInfo);
                consoleLogs.length = 0;

                await Promise.all([
                    page.goto(device.codes[0].urlWithLinkCode.replace(/[?&]preAuthSessionId=[^&#]+/, "")),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/auth");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SIGN_IN_AND_UP",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                ]);
            });

            it("Missing linkCode", async function () {
                const device = await setupDevice(page, inputName, contactInfo);
                consoleLogs.length = 0;

                await Promise.all([
                    page.goto(device.codes[0].urlWithLinkCode.replace(/#.*/, "")),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/auth");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SIGN_IN_AND_UP",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                ]);
            });
        });

        describe(`${contactMethod} + Link/Code`, function () {
            before(async function () {
                ({ browser, page } = await initBrowser(contactMethod, consoleLogs));
                await setFlow(contactMethod, "USER_INPUT_CODE_AND_MAGIC_LINK");
            });

            after(async function () {
                await browser.close();
                await fetch(`${TEST_SERVER_BASE_URL}/after`, {
                    method: "POST",
                }).catch(console.error);

                await fetch(`${TEST_SERVER_BASE_URL}/stop`, {
                    method: "POST",
                }).catch(console.error);
            });

            beforeEach(async function () {
                await clearBrowserCookiesWithoutAffectingConsole(page, consoleLogs);
                page.evaluate(() => localStorage.removeItem("supertokens-passwordless-loginAttemptInfo"));

                consoleLogs.length = 0;
            });

            it("Successful signin with link", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);

                await page.goto(device.codes[0].urlWithLinkCode);

                await page.waitForSelector(".sessionInfo-user-id");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS SESSION ON_HANDLE_EVENT SESSION_CREATED",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SUCCESS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                ]);
            });

            it("Successful signin with link and redirectToPath", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);

                await page.goto(device.codes[0].urlWithLinkCode.replace("?", "?redirectToPath=%2Fredirect-here&"));
                await page.waitForNavigation({ waitUntil: "networkidle0" });

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/redirect-here");
                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS SESSION ON_HANDLE_EVENT SESSION_CREATED",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SUCCESS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                ]);
            });

            it("Successful signin with link in another tab", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);

                const anotherTab = await browser.newPage();
                await anotherTab.goto(device.codes[0].urlWithLinkCode);
                await anotherTab.waitForNavigation({ waitUntil: "networkidle0" });

                await waitForText(page, "[data-supertokens=headerTitle]", "Success!");

                await page.reload({ waitUntil: ["networkidle0"] });

                await page.waitForSelector(".sessionInfo-user-id");

                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SESSION_ALREADY_EXISTS",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                ]);
                await anotherTab.close();
            });

            it("Successful signin with user input code", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);
                await setInputValues(page, [{ name: "userInputCode", value: device.codes[0].userInputCode }]);
                await submitForm(page);

                await page.waitForSelector(".sessionInfo-user-id");

                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS SESSION ON_HANDLE_EVENT SESSION_CREATED",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SUCCESS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                ]);
            });

            it("Successful signin with user input code and redirectToPath", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth?redirectToPath=%2Fredirect-here`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);
                await setInputValues(page, [{ name: "userInputCode", value: device.codes[0].userInputCode }]);
                await submitForm(page);

                await page.waitForNavigation();
                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/redirect-here");

                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS SESSION ON_HANDLE_EVENT SESSION_CREATED",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SUCCESS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                ]);
            });

            it("Successful signin with user input code in another tab", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);

                const anotherTab = await browser.newPage();
                await Promise.all([
                    anotherTab.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    anotherTab.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                await waitForSTElement(anotherTab, "[data-supertokens=input][name=userInputCode]");
                await setInputValues(anotherTab, [{ name: "userInputCode", value: device.codes[0].userInputCode }]);
                await submitForm(anotherTab);
                await anotherTab.waitForNavigation();

                await waitForText(page, "[data-supertokens=headerTitle]", "Success!");

                await page.reload({ waitUntil: ["networkidle0"] });

                await page.waitForSelector(".sessionInfo-user-id");

                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SESSION_ALREADY_EXISTS",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                ]);
                await anotherTab.close();
            });

            it("Clicking link of invalid device", async function () {
                const device = await setupDevice(page, inputName, contactInfo, false, false);

                for (let i = 3; i > 0; i--) {
                    await setInputValues(page, [{ name: "userInputCode", value: "22223" }]);
                    await submitForm(page);

                    if (i === 1) {
                        await waitForSTElement(page, "[data-supertokens~='generalError']");
                    } else {
                        await waitForSTElement(page, "[data-supertokens~='inputErrorMessage']");
                    }
                }

                await Promise.all([
                    page.goto(device.codes[0].urlWithLinkCode),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                const pathname = await page.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/auth");

                assert.deepStrictEqual(
                    [
                        "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                        "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                        "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                        "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                        "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                        "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_RESTART_FLOW",
                        "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                        "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                        "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                        "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                        "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_RESTART_FLOW",
                        "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SIGN_IN_AND_UP",
                        "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    ],
                    consoleLogs
                );
            });

            it("Successful signin with userInputCode after wrong link", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);

                const anotherTab = await browser.newPage();

                anotherTab.on("console", (consoleObj) => {
                    const log = consoleObj.text();
                    if (log.startsWith("ST_LOGS")) {
                        consoleLogs.push(log);
                    }
                });
                await anotherTab.goto(device.codes[0].urlWithLinkCode + "''");
                await anotherTab.waitForNavigation({ waitUntil: "networkidle0" });

                const pathname = await anotherTab.evaluate(() => window.location.pathname);
                assert.deepStrictEqual(pathname, "/auth");

                await waitForSTElement(anotherTab, "[data-supertokens=input][name=userInputCode]");
                await waitForSTElement(anotherTab, "[data-supertokens~='generalError']");

                await setInputValues(anotherTab, [{ name: "userInputCode", value: device.codes[0].userInputCode }]);
                await waitForSTElement(anotherTab, "[data-supertokens~='generalError']", true);
                await submitForm(anotherTab);

                await anotherTab.waitForSelector(".sessionInfo-user-id");

                assert.deepStrictEqual(consoleLogs, [
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CREATE_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CREATE_CODE",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT PASSWORDLESS_CODE_SENT",
                    "ST_LOGS PASSWORDLESS OVERRIDE SET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS SESSION OVERRIDE ADD_FETCH_INTERCEPTORS_AND_RETURN_MODIFIED_FETCH",
                    "ST_LOGS SESSION OVERRIDE ADD_AXIOS_INTERCEPTORS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SIGN_IN_AND_UP",
                    "ST_LOGS PASSWORDLESS OVERRIDE GET_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS OVERRIDE CONSUME_CODE",
                    "ST_LOGS PASSWORDLESS PRE_API_HOOKS PASSWORDLESS_CONSUME_CODE",
                    "ST_LOGS SESSION ON_HANDLE_EVENT SESSION_CREATED",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS PASSWORDLESS ON_HANDLE_EVENT SUCCESS",
                    "ST_LOGS PASSWORDLESS OVERRIDE CLEAR_LOGIN_ATTEMPT_INFO",
                    "ST_LOGS PASSWORDLESS GET_REDIRECTION_URL SUCCESS",
                    "ST_LOGS SESSION OVERRIDE GET_JWT_PAYLOAD_SECURELY",
                    "ST_LOGS SESSION OVERRIDE GET_USER_ID",
                ]);
                await anotherTab.close();
            });

            it("create code network error", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth?redirectToPath=%2Fredirect-here`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                await page.setRequestInterception(true);
                const requestHandler = (request) => {
                    if (request.url().endsWith("signinup/code")) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                };
                page.on("request", requestHandler);
                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);
                await waitForSTElement(page, "[data-supertokens~='generalError']");
                page.off("request", requestHandler);
                await page.setRequestInterception(false);
            });

            it("consume code network error", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth?redirectToPath=%2Fredirect-here`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                await page.setRequestInterception(true);
                const requestHandler = (request) => {
                    if (request.url().endsWith("signinup/code/consume")) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                };
                page.on("request", requestHandler);
                const loginAttemptInfo = JSON.parse(
                    await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
                );
                const device = await getDevice(loginAttemptInfo);
                await setInputValues(page, [{ name: "userInputCode", value: device.codes[0].userInputCode }]);
                await submitForm(page);
                await waitForSTElement(page, "[data-supertokens~='generalError']");
                page.off("request", requestHandler);
                await page.setRequestInterception(false);
            });

            it("resend code network error", async function () {
                await Promise.all([
                    page.goto(`${TEST_CLIENT_BASE_URL}/auth?redirectToPath=%2Fredirect-here`),
                    page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);

                await setInputValues(page, [{ name: inputName, value: contactInfo }]);
                await submitForm(page);

                await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");

                await page.setRequestInterception(true);
                const requestHandler = (request) => {
                    if (request.url().endsWith("signinup/code/resend")) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                };
                page.on("request", requestHandler);
                const resendBtn = await waitForSTElement(page, "[data-supertokens~=resendCodeBtn]:not(:disabled)");
                await resendBtn.click();
                await waitForSTElement(page, "[data-supertokens~='generalError']");
                page.off("request", requestHandler);
                await page.setRequestInterception(false);
            });
        });
    }
});

async function getDevice(loginAttemptInfo) {
    const deviceResp = await fetch(
        `${TEST_APPLICATION_SERVER_BASE_URL}/test/getDevice?preAuthSessionId=${encodeURIComponent(
            loginAttemptInfo.preAuthSessionId
        )}`,
        {
            method: "GET",
        }
    );
    return await deviceResp.json();
}

function setFlow(contactMethod, flowType) {
    return fetch(`${TEST_APPLICATION_SERVER_BASE_URL}/test/setFlow`, {
        method: "POST",
        headers: [["content-type", "application/json"]],
        body: JSON.stringify({
            contactMethod,
            flowType,
        }),
    });
}

async function setupDevice(page, inputName, contactInfo, forLinkOnly = true, cleanLoginAttemptInfo = true) {
    await Promise.all([
        page.goto(`${TEST_CLIENT_BASE_URL}/auth`),
        page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);
    await waitForSTElement(page, `[data-supertokens~=input][name=${inputName}]`);
    await setInputValues(page, [{ name: inputName, value: contactInfo }]);
    await submitForm(page);

    if (forLinkOnly) {
        await waitForSTElement(page, "[data-supertokens=sendCodeIcon]");
    } else {
        await waitForSTElement(page, "[data-supertokens=input][name=userInputCode]");
    }

    const loginAttemptInfo = JSON.parse(
        await page.evaluate(() => localStorage.getItem("supertokens-passwordless-loginAttemptInfo"))
    );
    if (cleanLoginAttemptInfo) {
        await page.evaluate(() => localStorage.removeItem("supertokens-passwordless-loginAttemptInfo"));
    }

    return getDevice(loginAttemptInfo);
}

async function initBrowser(contactMethod, consoleLogs) {
    await fetch(`${TEST_SERVER_BASE_URL}/beforeeach`, {
        method: "POST",
    }).catch(console.error);
    await fetch(`${TEST_APPLICATION_SERVER_BASE_URL}/beforeeach`, {
        method: "POST",
    }).catch(console.error);

    await fetch(`${TEST_SERVER_BASE_URL}/startst`, {
        method: "POST",
        headers: [["content-type", "application/json"]],
        body: JSON.stringify({
            configUpdates: [
                { key: "passwordless_code_lifetime", value: 2000 },
                { key: "passwordless_max_code_input_attempts", value: 3 },
            ],
        }),
    }).catch(console.error);

    const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--remote-debugging-port=9222"],
        headless: true,
    });
    const page = await browser.newPage();
    page.on("console", (consoleObj) => {
        const log = consoleObj.text();
        if (log.startsWith("ST_LOGS")) {
            consoleLogs.push(log);
        }
    });

    await Promise.all([
        page.goto(
            `${TEST_CLIENT_BASE_URL}/auth?authRecipe=passwordless&passwordlessContactMethodType=${contactMethod}`
        ),
        page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);

    return { browser, page };
}
