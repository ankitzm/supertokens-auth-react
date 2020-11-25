/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
 * Imports.
 */
import * as React from "react";
import { useState } from "react";
import { SignInAndUpThemeProps } from "../../../../types";

import SignUp from "./SignUp";
import SignIn from "./SignIn";
import { ThemeBase } from "../ThemeBase";

/*
 * Component.
 */

export function SignInAndUpTheme({ signInForm, signUpForm, defaultToSignUp }: SignInAndUpThemeProps): JSX.Element {
    /*
     * State.
     */

    const [isSignUp, setSignUp] = useState(defaultToSignUp);

    /*
     * Render.
     */

    // If isSignUp, return signUp.
    if (isSignUp) {
        return <SignUp {...signUpForm} signInClicked={() => setSignUp(false)} />;
    }

    // Otherwise, return SignIn.
    return <SignIn {...signInForm} signUpClicked={() => setSignUp(true)} />;
}

function SignInAndUpThemeWrapper(props: SignInAndUpThemeProps): JSX.Element {
    return (
        <ThemeBase>
            <SignInAndUpTheme {...props} />
        </ThemeBase>
    );
}

export default SignInAndUpThemeWrapper;
