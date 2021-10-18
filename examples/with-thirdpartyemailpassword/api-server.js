const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
require("dotenv").config();
let supertokens = require("supertokens-node");
let Session = require("supertokens-node/recipe/session");
let { verifySession } = require("supertokens-node/recipe/session/framework/express");
let { middleware, errorHandler } = require("supertokens-node/framework/express");
let ThirdPartyEmailPassword = require("supertokens-node/recipe/thirdpartyemailpassword");

const apiPort = process.env.REACT_APP_API_PORT || 3001;
const apiDomain = process.env.REACT_APP_API_URL || `http://localhost:${apiPort}`;
const websitePort = process.env.REACT_APP_WEBSITE_PORT || 3000;
const websiteDomain = process.env.REACT_APP_WEBSITE_URL || `http://localhost:${websitePort}`;

supertokens.init({
    framework: "express",
    supertokens: {
        // TODO: This is a core hosted for demo purposes. You can use this, but make sure to change it to your core instance URI eventually.
        connectionURI: "https://try.supertokens.io",
        apiKey: "<REQUIRED FOR MANAGED SERVICE, ELSE YOU CAN REMOVE THIS FIELD>",
    },
    appInfo: {
        appName: "SuperTokens Demo App", // TODO: Your app name
        apiDomain, // TODO: Change to your app's API domain
        websiteDomain, // TODO: Change to your app's website domain
    },
    recipeList: [
        ThirdPartyEmailPassword.init({
            providers: [
                // We have provided you with development keys which you can use for testing.
                // IMPORTANT: Please replace them with your own OAuth keys for production use.
                ThirdPartyEmailPassword.Google({
                    clientId: "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
                    clientSecret: "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",
                }),
                ThirdPartyEmailPassword.Github({
                    clientSecret: "e97051221f4b6426e8fe8d51486396703012f5bd",
                    clientId: "467101b197249757c71f",
                }),

                // we have commented the below because our app domain (ThirdPartyEmailPassword.demo.supertokens.io) is not approved by Facebook since it's only a demo app.
                // ThirdPartyEmailPassword.Facebook({
                //     clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                //     clientId: process.env.FACEBOOK_CLIENT_ID
                // })
            ],
        }),
        Session.init(),
    ],
});

const app = express();

app.use(
    cors({
        origin: websiteDomain, // TODO: Change to your app's website domain
        allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

app.use(morgan("dev"));
app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);
app.use(middleware());

// custom API that requires session verification
app.get("/sessioninfo", verifySession(), async (req, res) => {
    let session = req.session;
    res.send({
        sessionHandle: session.getHandle(),
        userId: session.getUserId(),
        jwtPayload: session.getJWTPayload(),
        sessionData: await session.getSessionData(),
    });
});

app.use(errorHandler());

app.use((err, req, res, next) => {
    res.status(500).send("Internal error: " + err.message);
});

app.listen(apiPort, () => console.log(`API Server listening on port ${apiPort}`));