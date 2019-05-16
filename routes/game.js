const express = require('express');
const router = express.Router();
require('dotenv').config();
const IP_ADDRESS = process.env.IP_ADDRESS;

/* GET home page. */
router.get('/', (req, res, next) => {
  const userInfo = {
    displayName: 'anonymous',
    thumbUrl: 'images/anonymous.jpg'
  };
  if (req.user) {
     userInfo.displayName = req.user.displayName;
     userInfo.thumbUrl = req.user.photos[0].value;
  }
  res.render('game', {
    title: 'オンライン対戦シューティングゲーム | ゲームつくるセンター葉山',
    displayName: userInfo.displayName,
    thumbUrl: userInfo.thumbUrl,
    ipAddress: IP_ADDRESS
   });
});

module.exports = router;
