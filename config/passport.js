const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require('../models/user');

// Configure Google strategy
passport.use(
    new GoogleStrategy(
      {
        clientID: '213416676530-sb0dptjdnti5dor6k5vmqbjhhk58l7d9.apps.googleusercontent.com',
        clientSecret: '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',
        callbackURL: '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if a user with the given Google ID exists
          let user = await User.findOne({ googleId: profile.id });
          
          if (!user) {
            // Check if a user with the same email exists
            user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
            } else {
              // Create a new user if no user with the same email exists
              user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
              });
            }
            await user.save(); // Save either the linked or the new user
          }
          
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
  

// Serialize user for session
passport.serializeUser((user, done) => done(null, user.id));

// Deserialize user by ID (updated to use async/await)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id); // Now uses async/await
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;