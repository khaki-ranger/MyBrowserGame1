const auth = require('basic-auth');
require('dotenv').config();
const BASIC_PASSWORD = process.env.BASIC_PASSWORD;

const admins = {
  admin: { password: BASIC_PASSWORD },
};

module.exports = function (request, response, next) {
  var user = auth(request);
  if (!user || !admins[user.name] || admins[user.name].password !== user.pass) {
    response.set('WWW-Authenticate', 'Basic realm="example"');
    return response.status(401).send();
  }
  return next();
};
