const checkSession = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

const isLogin = (req, res, next) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    next();
  }
};

function checkOTPVerified(req, res, next) {
  if (!req.session.isVerified) {
    return res.redirect("/verify-otp");
  }
  next();
}


module.exports = { checkSession, isLogin, checkOTPVerified };