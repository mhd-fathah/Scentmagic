const User = require('../models/user');

const checkSession = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

const setAuthStatus = (req, res, next) => {
  res.locals.isAuthenticated = !!req.session.user; 
  next();
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

const checkBlocked = (req, res, next) => {
  if (req.user) {
    User.findById(req.user._id)
      .then(user => {
        if (user.isBlocked) {
          return res.render('banned'); 
        } else {
          return next(); 
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500).send("Server Error");
      });
  } else {
    return next();
  }
};




module.exports = { checkSession, setAuthStatus , isLogin, checkOTPVerified , checkBlocked};