var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var session = require('express-session');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

require('dotenv').config();
const TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY;
const TWITTER_SECRET = process.env.TWITTER_SECRET;
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL;

var indexRouter = require('./routes/index');
var gameRouter = require('./routes/game');

passport.use(new TwitterStrategy({
    consumerKey: TWITTER_CONSUMER_KEY ,
    consumerSecret: TWITTER_SECRET,
    callbackURL: TWITTER_CALLBACK_URL
  },
  function(token, tokenSecret, profile, cb) {
    process.nextTick(function () {
      return cb(null, profile);
    });
  })
);

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'displayName', 'photos']
  },
  function (accessToken, refreshToken, profile, cb) {
    process.nextTick(function () {
      return cb(null, profile);
    });
  })
);

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

var app = express();
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: 'e64cf6d0aaef3aa4', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/game', gameRouter);

app.get('/login/twitter',
  passport.authenticate('twitter')
);

app.get('/oauth_callback',
  passport.authenticate('twitter', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/login/facebook',
  passport.authenticate('facebook')
);

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function (req, res) {
    res.redirect('/');
  }
);

app.get('/logout', function (req, res) {
  req.logout();
    res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
