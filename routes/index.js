const express = require('express');
const router = express.Router();
const configVars = require('./config-vars');

router.get('/', (req, res, next) => {
  res.render('index', {
    title: 'ゲームつくるセンター葉山のゲーム',
    user: req.user,
    configVars: configVars
  });
});

module.exports = router;
