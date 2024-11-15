const User = require('../models/user');

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

// Middleware to check if the user is blocked
const checkBlocked = (req, res, next) => {
  if (req.user) {
    User.findById(req.user._id)
      .then(user => {
        if (user.isBlocked) {
          return res.redirect('/banned'); // Redirect to banned page if the user is blocked
        } else {
          return next(); // Continue to the next middleware or route if the user is not blocked
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500).send("Server Error");
      });
  } else {
    return next(); // If no user is authenticated, proceed with other middleware
  }
};




module.exports = { checkSession, isLogin, checkOTPVerified , checkBlocked};