const User = require("../models/user");
const bcrypt = require("bcrypt");
const saltRound = 10;
const { sendOTPEmail, generateOTP } = require("../utils/otpService");
const passport = require("passport");
const crypto = require("crypto");
require("dotenv").config();
const nodemailer = require("nodemailer");
const Category = require("../models/categories");
const Product = require("../models/product");
const mongoose = require("mongoose");
const Reviews = require("../models/review");


const signupUser = async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .render("signup", { layout: false, message: "Email already exists" });
    }

    const otp = generateOTP();
    await sendOTPEmail(email, otp);

    req.session.otp = otp;
    req.session.otpExpiresAt = Date.now() + 5 * 60 * 1000;
    req.session.user = { name, mobile, email, password };

    res.render("verify-otp", {
      layout: false,
      message: "OTP sent to your email.",
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res
      .status(500)
      .render("signup", { layout: false, message: "Internal Server Error" });
  }
};

const verifyOTP = async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res.render("verify-otp", {
      layout: false,
      message: "OTP is required.",
    });
  }

  if (otp === req.session.otp) {
    req.session.isVerified = true;

    const { name, mobile, email, password } = req.session.user;

    const hashedPassword = await bcrypt.hash(password, saltRound);
    const user = new User({ name, mobile, email, password: hashedPassword });
    await user.save();

    req.session.user = user;
    delete req.session.otp;

    res.redirect("/");
  } else {
    delete req.session.otp;
    delete req.session.user;

    res.render("verify-otp", {
      layout: false,
      message: "Invalid OTP. Please try again.",
    });
  }
};

const resendOTP = async (req, res) => {
  try {
    console.log("Resend OTP function called");

    const { email } = req.session.user || {};
    if (!email) {
      console.log("No email found in session.");
      return res.status(400).render("verify-otp", {
        layout: false,
        message: "User not logged in or email missing.",
      });
    }

    console.log("Email for resend OTP:", email);

    const newOTP = generateOTP();
    console.log("Generated new OTP:", newOTP);

    await sendOTPEmail(email, newOTP);
    console.log("OTP sent successfully to:", email);

    req.session.otp = newOTP;
    req.session.lastOTPSend = Date.now();

    res.render("verify-otp", {
      layout: false,
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).render("verify-otp", {
      layout: false,
      message: "Failed to resend OTP.",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("login", {
        layout: false,
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.redirect("/banned");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).render("login", {
        layout: false,
        message: "Invalid email or password",
      });
    }

    req.session.user = user;
    console.log("Session after login:", req.session);

    return res.render("home", { user, message: "Logged in successfully" });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).render("login", {
      layout: false,
      message: "Internal Server Error",
    });
  }
};

const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});
const googleAuthCallback = (req, res, next) => {
  passport.authenticate(
    "google",
    { failureRedirect: "/login" },
    (err, user) => {
      if (err) {
        console.error("Google Auth Error:", err);
        return next(err);
      }
      if (!user) {
        console.log("No user found, redirecting to login.");
        return res.redirect("/login");
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Error logging in user:", loginErr);
          return next(loginErr);
        }

        if (user.isBlocked) {
          return res.redirect("/banned");
        }

        req.session.user = user;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session Save Error:", saveErr);
            return next(saveErr);
          }
          console.log("Session saved successfully, redirecting to home.");
          res.redirect("/");
        });
      });
    }
  )(req, res, next);
};

const logout = (req, res) => {
  req.session.user = null;
  req.session.message = "You are Successfully Logged Out.";
  res.redirect("/login");
};

const loadSignup = (req, res) => {
  try {
    res.render("signup", { layout: false, message: null });
  } catch (error) {
    console.error("Error loading signup page:", error);
    res.status(500).send("Error loading signup page");
  }
};

const loadLogin = (req, res) => {
  try {
    const message = req.session.message;
    req.session.message = null;

    res.render("login", {
      layout: false,
      message,
      query: req.query || {},
    });
  } catch (error) {
    console.error("Error loading login page:", error);
    res.status(500).send("Error loading login page");
  }
};

const loadHome = async (req, res) => {
  try {
    const categories = await Category.find(
      { isDeleted: false },
      "name image"
    ).lean();

    const latestProducts = await Product.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(6)
      .select(
        "product_name discount_price regular_price product_images category stock_status"
      )
      .populate("category", "name")
      .lean();

    const relatedProducts = await Product.find({
      isDeleted: false,
      category: latestProducts[0]?.category._id,
    })
      .select(
        "product_name discount_price regular_price product_images category stock_status"
      )
      .populate("category", "name")
      .lean();

    res.render("home", {
      categories,
      latestProducts,
      relatedProducts,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("forgot-password", {
        message: "Email not found",
        layout: false,
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "fathu6214@gmail.com",
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      to: user.email,
      from: "password-reset@scentmagic.com",
      subject: "Scentmagic Password Reset",
      text: `Please click the following link to reset your password:\n\nhttp://localhost:3000/reset-password/${token}`,
    };

    await transporter.sendMail(mailOptions);
    res.render("forgot-password", {
      message: "Reset link sent to your email.",
      layout: false,
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).render("forgot-password", {
      message: "Internal Server Error",
      layout: false,
    });
  }
};

const loadResetPasswordForm = async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).render("reset-password", {
      message: "Invalid or expired token.",
      layout: false,
    });
  }

  res.render("reset-password", { token, layout: false });
};

async function resetPassword(req, res) {
  try {
    const { password } = req.body;
    const token = req.params.token;

    const hashedPassword = await bcrypt.hash(password, saltRound);

    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.status(400).send("Invalid or expired token");
    }

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.locals.message =
      "Password successfully reset. You can now log in with your new password.";

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}

const loadForgotPassword = (req, res) => {
  res.render("forgot-password", { message: "", layout: false });
};

const getBannedPage = (req, res) => {
  if (req.session.user) {
    if (!req.session.user.isBlocked) {
      return res.redirect("/");
    }
  }
  res.render("banned");
};

const productDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid Product ID");
    }

    const product = await Product.findById(productId)
      .populate("category")
      .populate({
        path: "reviews",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .lean();

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const relatedProducts = await Product.find({
      category: product.category?._id,
      _id: { $ne: productId },
      isDeleted: false,
    })
      .limit(4)
      .lean();

    res.render("product/details", {
      product,
      relatedProducts,
      userId: req.user ? req.user._id : null,
      categories: product.category || {},
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).send("Server error");
  }
};

const addReview = async (req, res) => {
  const { productId, rating, comment } = req.body;
  const userId = req.user._id;

  try {
    const newReview = new Review({
      user: userId,
      rating,
      comment,
    });

    await newReview.save();

    const user = await User.findById(userId);
    user.reviews.push(newReview._id);
    await user.save();

    const product = await Product.findById(productId);
    product.reviews.push(newReview._id);
    product.reviewsCount = product.reviews.length;
    await product.save();

    res.status(200).json({ message: "Review added successfully!" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while adding the review." });
  }
};

// Define the subscribeNewsletter controller
const subscribeNewsletter = async (req, res) => {
  const userEmail = req.body.email;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "fathu6214@gmail.com",
      pass: "jawlcedqdluzygfu",
    },
  });

  const adminMailOptions = {
    from: "your-email@gmail.com",
    to: "fathu6214@gmail.com",
    subject: "New Subscriber",
    text: `A new user has subscribed with the email: ${userEmail}`,
  };

  const userMailOptions = {
    from: "your-email@gmail.com",
    to: userEmail,
    subject: "Subscription Confirmed",
    text: `Thank you for subscribing to our newsletter! You're now subscribed to receive our latest updates and offers.`,
  };

  try {
    setTimeout(async () => {
      try {
        await Promise.all([
          transporter.sendMail(adminMailOptions),
          transporter.sendMail(userMailOptions),
        ]);

        res.status(200).json({
          success: true,
          message: "You have successfully subscribed!",
        });
      } catch (error) {
        console.error("Error sending emails:", error);
        res.status(500).json({
          success: false,
          message: "There was an error with the subscription process.",
        });
      }
    }, 2000);
  } catch (error) {
    console.error("Error during subscription process:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
};

const searchProducts = async (query) => {
  try {
      // Search for products in the database using the query
      const products = await Product.find({
          product_name: { $regex: query, $options: 'i' }  // Case-insensitive search
      });

      return products;  // Return the products found
  } catch (error) {
      console.error('Error during search:', error);
      throw new Error('Error searching products');
  }
};

module.exports = {
  signupUser,
  loginUser,
  logout,
  loadSignup,
  loadLogin,
  loadHome,
  verifyOTP,
  resendOTP,
  googleAuth,
  googleAuthCallback,
  forgotPassword,
  loadResetPasswordForm,
  resetPassword,
  loadForgotPassword,
  getBannedPage,
  productDetails,
  addReview,
  subscribeNewsletter,
  searchProducts
};
