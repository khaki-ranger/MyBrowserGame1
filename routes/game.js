const express = require('express');
const router = express.Router();
require('dotenv').config();
const IP_ADDRESS = process.env.IP_ADDRESS;
const configVars = require('./config-vars');

/* GET home page. */
router.get('/', (req, res, next) => {
  const userInfo = {
    displayName: '匿名',
    thumbUrl: 'images/anonymous.jpg'
  };
  if (req.user) {
     userInfo.displayName = req.user.displayName;
     userInfo.thumbUrl = req.user.photos[0].value;
  }
  res.render('game', {
    title: 'ゲーム画面 | ゲームつくるセンター葉山のゲーム',
    displayName: userInfo.displayName,
    thumbUrl: userInfo.thumbUrl,
    ipAddress: IP_ADDRESS,
    configVars: configVars
   });
});

module.exports = router;
