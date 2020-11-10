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
import root from "react-shadow/emotion";
import { ST_ROOT_CONTAINER } from "../../constants";
import ErrorBoundary from "./errorBoundary";

/** @jsx jsx */
import { jsx } from "@emotion/core";
import { NormalisedDefaultStyles } from "../emailpassword/types";
import { Fragment } from "react";

/*
 * Props.
 */

type FeatureWrapperProps = {
    defaultStyles: NormalisedDefaultStyles;
    children: JSX.Element;
    useShadowDom?: boolean;
};

/*
 * Component.
 */

export default function FeatureWrapper({ children, defaultStyles, useShadowDom }: FeatureWrapperProps): JSX.Element {
    /*
     * Render.
     */
    return (
        <ErrorBoundary>
            <WithOrWithoutShadowDom defaultStyles={defaultStyles} useShadowDom={useShadowDom}>
                <Fragment>
                    {children}
                    <link
                        href="//fonts.googleapis.com/css?family=Rubik:wght@300;400;500;700"
                        rel="stylesheet"
                        type="text/css"></link>
                </Fragment>
            </WithOrWithoutShadowDom>
        </ErrorBoundary>
    );
}

function WithOrWithoutShadowDom({ children, defaultStyles, useShadowDom }: FeatureWrapperProps): JSX.Element {
    // If explicitely specified to not use shadow dom.
    if (useShadowDom === false) {
        return (
            <div css={defaultStyles.root} id={ST_ROOT_CONTAINER}>
                {children}
            </div>
        );
    }

    // Otherwise, use shadow dom.
    return (
        <root.div css={defaultStyles.root} id={ST_ROOT_CONTAINER}>
            {children}
        </root.div>
    );
}