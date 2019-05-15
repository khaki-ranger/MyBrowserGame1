const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  res.render('index', {
    title: 'オンライン対戦シューティングゲーム',
    user: req.user
  });
});

module.exports = router;
