function isLoggedIn(req, res, next) {
  if (req.cookies && req.cookies.uid) return next();
  res.status(401).json({ message: '로그인 필요' });
}

module.exports = { isLoggedIn };
