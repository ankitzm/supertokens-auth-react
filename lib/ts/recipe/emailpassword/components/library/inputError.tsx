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

/** @jsx jsx */
import { jsx } from "@emotion/core";
import * as React from "react";
import { CSSObject } from "@emotion/serialize/types/index";
import { NormalisedDefaultStyles } from "../../types";

/*
 * Props.
 */

type InputErrorProps = {
    style: CSSObject;
    error: string;
    defaultStyles: NormalisedDefaultStyles;
};

/*
 * Component.
 */

export default function InputError({ style, error, defaultStyles }: InputErrorProps): JSX.Element {
    /*
     * Render.
     */

    return (
        <div className="inputErrorMessage" css={[defaultStyles.inputErrorMessage, style]}>
            {error}
        </div>
    );
}