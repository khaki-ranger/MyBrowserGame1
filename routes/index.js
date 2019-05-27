const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  res.render('index', {
    title: 'タイトル未定',
    user: req.user
  });
});

module.exports = router;
