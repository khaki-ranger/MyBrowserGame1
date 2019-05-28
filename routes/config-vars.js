'use strict';
require('dotenv').config();

const configVars = {
  facebook: {
    app_id: process.env.FACEBOOK_APP_ID,
    app_secret: process.env.FACEBOOK_APP_SECRET
  },
  twitter: {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_SECRET
  },
  google: {
    ga_id: process.env.GOOGLE_GA_ID
  },
  heroku: {
    url: process.env.IP_ADDRESS
  },
};

module.exports = configVars;
