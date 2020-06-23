const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const finale = require('finale-rest');
const OktaJwtVerifier = require('@okta/jwt-verifier');

const oktaJwtVerifier = new OktaJwtVerifier({
    clientId: '0oagrv82uRw9xGlga4x6',
    issuer: 'https://{yourOktaDomain}/oauth2/default'
});

let app = express();
app.use(cors());
app.use(bodyParser.json());

// verify JWT token middleware
app.use((req, res, next) => {
    // require every request to have an authorization header
    if (!req.headers.authorization) {
        return next(new Error('Authorization header is required'))
    }
    let parts = req.headers.authorization.trim().split(' ');
    let accessToken = parts.pop();
    oktaJwtVerifier.verifyAccessToken(accessToken)
        .then(jwt => {
            req.user = {
                uid: jwt.claims.uid,
                email: jwt.claims.sub
            };
            next()
        })
        .catch(next) // jwt did not verify!
});

// For ease of this tutorial, we are going to use SQLite to limit dependencies
let database = new Sequelize({
    dialect: 'sqlite',
    storage: './test.sqlite'
});

// Define our Post model
// id, createdAt, and updatedAt are added by sequelize automatically
let Wine = database.define('wines', {
    title: Sequelize.STRING,
    body: Sequelize.TEXT
});

// Initialize finale
finale.initialize({
    app: app,
    sequelize: database
});

// Create the dynamic REST resource for our Post model
let userResource = finale.resource({
    model: Wine,
    endpoints: ['/wines', '/wines/:id']
});

// Resets the database and launches the express app on :8081
database
    .sync({ force: true })
    .then(() => {
        app.listen(process.env.PORT || 8081, () => {
            console.log('The server has started on port 8081');
        });
    });
