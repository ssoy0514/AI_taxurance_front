// ~/server-middleware/session.js
const session = require('express-session')

module.exports = session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'local_secret_key',
  resave: false,
  saveUninitialized: false,
  rolling: false, // local 갱신 안 함
  cookie: {
    httpOnly: true,
    secure: true,
    maxAge: null, // 관리 안 함
  },
})
