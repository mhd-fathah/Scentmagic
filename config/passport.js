const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require('../models/user');
require('dotenv').config()

passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          
          if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
              user.googleId = profile.id;
            } else {
              user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
              });
            }
            await user.save(); 
          }
          
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
  

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id); 
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;