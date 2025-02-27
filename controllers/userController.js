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
const Cart = require("../models/cart");
const mongoose = require("mongoose");
const Coupon = require("../models/coupon");
const Wallet = require("../models/wallet");
const Referral = require("../models/refferral");
const HttpStatus = require("../constants/httpStatus");
const Messages = require("../constants/messages");
const URLs = require("../constants/urls");

const signupUser = async (req, res) => {
  try {
    const { name, mobile, email, password, referralCode } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(HttpStatus.BAD_REQUEST).render("signup", {
        layout: false,
        message: "Email already exists. Please try with a different email.",
      });
    }

    let referrer = null;
    if (referralCode) {
      referrer = await Referral.findOne({
        referralCode,
        status: "Active",
      }).populate("user");
      if (!referrer) {
        return res.status(HttpStatus.BAD_REQUEST).render("signup", {
          layout: false,
          message: "Invalid referral code. Please try again.",
        });
      }
    }

    const otp = generateOTP();
    console.log(otp);
    await sendOTPEmail(email, otp);

    req.session.otp = otp;
    req.session.otpExpiresAt = Date.now() + 5 * 60 * 1000;
    req.session.tempUserData = { name, mobile, email, password, referralCode };

    if (referrer) {
      req.session.referrerId = referrer.user._id;
    }

    res.render("verify-otp", {
      layout: false,
      message: "OTP sent to your email.",
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render("signup", {
      layout: false,
      message: "Internal Server Error. Please try again later.",
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const { otp: storedOtp, otpExpiresAt } = req.session;

    if (!otp) {
      return res.json({ success: false, message: "OTP is required." });
    }

    if (Date.now() > otpExpiresAt) {
      return res.json({ success: false, expired: true });
    }

    if (otp !== storedOtp) {
      return res.json({ success: false, message: "Invalid OTP." });
    }

    const user = req.session.tempUserData;

    const newUser = new User({
      email: user.email,
      name: user.name,
      mobile: user.mobile,
      password: await bcrypt.hash(user.password, 10),
    });

    await newUser.save();

    const newWallet = new Wallet({
      userId: newUser._id,
      balance: 0,
    });

    await newWallet.save();

    newUser.wallet = newWallet._id;
    await newUser.save();

    if (user.referralCode && req.session.referrerId) {
      const referrer = await User.findById(req.session.referrerId);

      if (referrer) {
        const referrerWallet = await Wallet.findOne({ userId: referrer._id });
        if (referrerWallet) {
          referrerWallet.balance += 500;
          referrerWallet.transactions.push({
            id: `txn-${Date.now()}-referral`,
            type: "Credit",
            amount: 500,
            date: Date.now(),
          });
          await referrerWallet.save();
        }

        newWallet.balance += 500;
        newWallet.transactions.push({
          id: `txn-${Date.now()}-bonus`,
          type: "Credit",
          amount: 500,
          date: Date.now(),
        });
        await newWallet.save();

        const referral = new Referral({
          user: referrer._id,
          referralCode: user.referralCode,
          totalReferrals: (referrer.totalReferrals || 0) + 1,
          totalEarned: (referrer.totalEarned || 0) + 500,
        });

        await referral.save();
      }
    }

    req.session.user = newUser;
    delete req.session.otp;
    delete req.session.otpExpiresAt;
    delete req.session.tempUserData;
    delete req.session.referrerId;

    return res.json({ success: true });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error." });
  }
};

const resendOTP = async (req, res) => {
  console.log("Resend OTP endpoint hit");

  try {
    const email = req.session.tempUserData?.email;
    console.log("Email from session:", email);

    if (!email) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "User email not found in session." });
    }

    const newOTP = generateOTP();
    console.log("Generated OTP:", newOTP);

    await sendOTPEmail(email, newOTP);

    req.session.otp = newOTP;
    req.session.otpExpiresAt = Date.now() + 5 * 60 * 1000;

    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "OTP resent successfully." });
  } catch (error) {
    console.error("Error in resendOTP function:", error);
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to resend OTP." });
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
      return res.redirect(URLs.USER_BANNED);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(HttpStatus.BAD_REQUEST).render("login", {
        layout: false,
        message: "Invalid email or password",
      });
    }

    req.session.user = user;
    console.log("Session after login:", req.session);

    return res.redirect(URLs.USER_HOME);
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render("login", {
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
    { failureRedirect: URLs.USER_LOGIN },
    async (err, user) => {
      if (err) {
        console.error("Google Auth Error:", err);
        return next(err);
      }
      if (!user) {
        console.log("No user found, redirecting to login.");
        return res.redirect(URLs.USER_LOGIN);
      }

      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          console.error("Error logging in user:", loginErr);
          return next(loginErr);
        }

        if (user.isBlocked) {
          return res.redirect(URLs.USER_BANNED);
        }

        try {
          let wallet = await Wallet.findOne({ userId: user._id });
          if (!wallet) {
            wallet = new Wallet({
              userId: user._id,
              balance: 0,
              transactions: [],
            });
            await wallet.save();
            console.log(
              "Default wallet created successfully for user:",
              user._id
            );
          }

          req.session.user = user;
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("Session Save Error:", saveErr);
              return next(saveErr);
            }
            console.log("Session saved successfully, redirecting to home.");
            res.redirect(URLs.USER_HOME);
          });
        } catch (walletErr) {
          console.error("Wallet Creation Error:", walletErr);
          return next(walletErr);
        }
      });
    }
  )(req, res, next);
};

const logout = (req, res) => {
  req.session.user = null;
  req.session.message = "You are Successfully Logged Out.";
  res.redirect(URLs.USER_LOGIN);
};

const loadSignup = (req, res) => {
  try {
    res.render("signup", { layout: false, message: null });
  } catch (error) {
    console.error("Error loading signup page:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send("Error loading signup page");
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
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send("Error loading login page");
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
      // category: latestProducts[0]?.category._id,
    })
      .select(
        "product_name discount_price regular_price product_images category stock_status leftStock"
      )
      .populate("category", "name")
      .lean();

    latestProducts.forEach((product) => {
      if (product.regular_price > product.discount_price) {
        product.extra_offer_percentage = Math.round(
          ((product.regular_price - product.discount_price) /
            product.regular_price) *
            100
        );
      } else {
        product.extra_offer_percentage = 0;
      }
    });

    relatedProducts.forEach((product) => {
      if (product.regular_price > product.discount_price) {
        product.extra_offer_percentage = Math.round(
          ((product.regular_price - product.discount_price) /
            product.regular_price) *
            100
        );
      } else {
        product.extra_offer_percentage = 0;
      }
    });

    const discountedProducts = await Product.find({
      isDeleted: false,
      discount_price: { $lt: mongoose.Types.Decimal128.fromString("Infinity") },
    })
      .populate("category", "name")
      .lean();

    discountedProducts.forEach((product) => {
      if (product.regular_price > product.discount_price) {
        product.extra_offer_percentage = Math.round(
          ((product.regular_price - product.discount_price) /
            product.regular_price) *
            100
        );
      } else {
        product.extra_offer_percentage = 0;
      }
    });

    res.render("home", {
      title: "Home",
      categories,
      latestProducts,
      relatedProducts,
      discountedProducts,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(HttpStatus.BAD_REQUEST).render("forgot-password", {
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render("forgot-password", {
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
    return res.status(HttpStatus.BAD_REQUEST).render("reset-password", {
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
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send("Invalid or expired token");
    }

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.locals.message =
      "Password successfully reset. You can now log in with your new password.";

    res.redirect(URLs.USER_LOGIN);
  } catch (err) {
    console.error(err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
  }
}

const loadForgotPassword = (req, res) => {
  res.render("forgot-password", { message: "", layout: false });
};

const getBannedPage = (req, res) => {
  if (req.session.user) {
    if (!req.session.user.isBlocked) {
      return res.redirect(URLs.USER_HOME);
    }
  }
  res.render("banned", {
    title: "banned",
  });
};

const productDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(HttpStatus.BAD_REQUEST).send("Invalid Product ID");
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false })
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
      return res.status(HttpStatus.NOT_FOUND).render("error", {
        message:
          "The product you are looking for has been deleted or is no longer available.",
        layout: false,
      });
    }

    const isOutOfStock = !product.leftStock || product.leftStock <= 0;

    const relatedProducts = await Product.find({
      category: product.category?._id,
      _id: { $ne: productId },
      isDeleted: false,
    })
      .limit(4)
      .lean();

    res.render("product/details", {
      title: "Product Details",
      product,
      isOutOfStock,
      relatedProducts,
      userId: req.user ? req.user._id : null,
      categories: product.category || {},
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
  }
};

const addReview = async (req, res) => {
  const { productId, rating, comment } = req.body;
  const userId = req.session.user._id;

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

    res.status(HttpStatus.OK).json({ message: "Review added successfully!" });
  } catch (error) {
    console.error(error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred while adding the review." });
  }
};

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

        res.status(HttpStatus.OK).json({
          success: true,
          message: "You have successfully subscribed!",
        });
      } catch (error) {
        console.error("Error sending emails:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "There was an error with the subscription process.",
        });
      }
    }, 2000);
  } catch (error) {
    console.error("Error during subscription process:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
};

const searchProducts = async (query, categoryId = null) => {
  try {
    let conditions = {
      product_name: { $regex: query, $options: "i" },
      isDeleted: false,
    };

    if (categoryId) {
      conditions.category = categoryId;
    }

    const products = await Product.find(conditions)
      .populate("reviews", "rating")
      .lean();

    products.forEach((product) => {
      if (product.regular_price && product.discount_price) {
        const discount =
          ((product.regular_price - product.discount_price) /
            product.regular_price) *
          100;
        product.discountPercentage = Math.round(discount);
      } else {
        product.discountPercentage = 0;
      }

      if (product.reviews && product.reviews.length > 0) {
        const totalRatings = product.reviews.length;
        const averageRating =
          product.reviews.reduce((sum, review) => sum + review.rating, 0) /
          totalRatings;

        product.averageRating = averageRating.toFixed(1);
        product.totalRatings = totalRatings;
      } else {
        product.averageRating = null;
        product.totalRatings = 0;
      }
    });

    return products;
  } catch (error) {
    console.error("Error during search:", error);
    throw new Error("Error searching products");
  }
};

const getProductsPage = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false });

    const sortOption = req.query.sort || "price_asc";
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const categoryId = req.query.category;
    const category = categoryId ? await Category.findById(categoryId) : null;

    let filter = { isDeleted: false };

    if (categoryId) {
      filter.category = categoryId;
    }

    const { minPrice, maxPrice } = req.query;
    if (minPrice) {
      filter.discount_price = { $gte: parseFloat(minPrice) };
    }
    if (maxPrice) {
      filter.discount_price = filter.discount_price
        ? { ...filter.discount_price, $lte: parseFloat(maxPrice) }
        : { $lte: parseFloat(maxPrice) };
    }

    let sortCriteria = {};
    if (sortOption === "price_asc") sortCriteria = { discount_price: 1 };
    if (sortOption === "price_desc") sortCriteria = { discount_price: -1 };
    if (sortOption === "name_asc") sortCriteria = { product_name: 1 };
    if (sortOption === "name_desc") sortCriteria = { product_name: -1 };

    const products = await Product.find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .populate("category")
      .lean();

    products.forEach((product) => {
      product.total_discount_price =
        product.total_discount_price ?? product.discount_price;
    });

    const discountedProducts = await Product.find({
      isDeleted: false,
      discount_price: { $lt: mongoose.Types.Decimal128.fromString("Infinity") },
    })
      .populate("category")
      .lean();

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    if (req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res.json({
        products,
        discountedProducts,
        totalProducts,
        totalPages,
        currentPage: page,
        sortOption,
      });
    }

    res.render("shop", {
      title: "Shop",
      categories,
      products,
      discountedProducts,
      totalProducts,
      totalPages,
      currentPage: page,
      sortOption: sortOption,
      category,
    });
  } catch (err) {
    console.error("Error fetching products page:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const loadMyAccount = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    res.render("my account/my_account", { title: "My Account", user });
  } catch (err) {
    console.error(err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const loadEditProfile = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .render("my account/view-profile", {
          title: "Edit Profile",
          user: null,
          passwordResetSuccess: false,
          addresses: [],
          layout: false,
          message: "User not found.",
        });
    }

    res.render("my account/view-profile", {
      title: "Edit Profile",
      user,
      passwordResetSuccess: req.query.passwordResetSuccess === "true",
      addresses: user.addresses || [],
      layout: false,
      message: "",
    });
  } catch (err) {
    console.error("Error loading profile page:", err);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .render("my account/view-profile", {
        title: "Edit Profile",
        user: req.user || null,
        passwordResetSuccess: false,
        addresses: [],
        layout: false,
        message: "Internal Server Error. Please try again later.",
      });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { fullName, firstName, lastName, email, phone, gender } = req.body;

    if (!email || !fullName || !phone) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .render("my account/view-profile", {
          message: "Required fields cannot be empty.",
          passwordResetSuccess: req.query.passwordResetSuccess === "true",
          addresses: req.user.addresses,
          user: req.user,
          layout: false,
        });
    }

    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .render("my account/view-profile", {
          message: "User not found.",
          passwordResetSuccess: req.query.passwordResetSuccess === "true",
          addresses: [],
          user: req.user,
          layout: false,
        });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name: fullName,
        firstName,
        lastName,
        email,
        mobile: phone,
        gender,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .render("my account/view-profile", {
          message: "User not found.",
          passwordResetSuccess: req.query.passwordResetSuccess === "true",
          addresses: existingUser.addresses,
          user: req.user,
          layout: false,
        });
    }

    res.render("my account/view-profile", {
      message: "Profile updated successfully!",
      passwordResetSuccess: req.query.passwordResetSuccess === "true",
      addresses: updatedUser.addresses,
      user: updatedUser,
      layout: false,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .render("my account/view-profile", {
        message:
          "An error occurred while updating your profile. Please try again.",
        passwordResetSuccess: req.query.passwordResetSuccess === "true",
        addresses: req.user ? req.user.addresses : [],
        user: req.user,
        layout: false,
      });
  }
};

const loadAddressPage = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);

    const message = req.query.message || null;

    res.render("my account/address", {
      message: message,
      title: "Address",
      user: user,
      layout: false,
      addresses: user.addresses,
    });
  } catch (err) {
    console.error(err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const addNewAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, state, address, city, type } = req.body;

    if (!name || !mobile || !pincode || !state || !address || !city || !type) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .render("my account/view-profile", {
          message: "All fields are required.",
          passwordResetSuccess: req.query.passwordResetSuccess === "true",
          addresses: req.user.addresses,
          user: req.user,
          layout: false,
        });
    }

    const newAddress = {
      type,
      fullName: name,
      mobile,
      pincode,
      state,
      address,
      city,
    };

    const user = await User.findById(req.session.user._id);

    if (!user) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .render("my account/view-profile", {
          message: "User not found.",
          passwordResetSuccess: req.query.passwordResetSuccess === "true",
          addresses: req.user.addresses,
          user: req.user,
          layout: false,
        });
    }

    user.addresses.push(newAddress);

    await user.save();

    res.render("my account/address", {
      title: "Address",
      message: "Address updated successfully!",
      user,
      layout: false,
      addresses: user.addresses,
    });
  } catch (err) {
    console.error("Error adding address:", err);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .render("my account/view-profile", {
        message:
          "An error occurred while adding the address. Please try again.",
        passwordResetSuccess: req.query.passwordResetSuccess === "true",
        user: req.user,
        layout: false,
      });
  }
};

const getEditAddressForm = async (req, res) => {
  try {
    const addressId = req.params.id;

    const user = await User.findById(req.session.user._id);

    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).send("User not found");
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(HttpStatus.NOT_FOUND).send("Address not found");
    }

    res.render("my account/edit-address", {
      address: address,
      user: req.user,
      layout: false,
    });
  } catch (err) {
    console.error("Error fetching address:", err);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send("An error occurred while fetching the address.");
  }
};

const updateAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, state, address, city, type } = req.body;
    const addressId = req.params.id;

    if (!name || !mobile || !pincode || !state || !address || !city || !type) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .render("my account/edit-address", {
          message: "All fields are required.",
          address: { ...req.body },
          user: req.user,
          layout: false,
        });
    }

    const user = await User.findById(req.session.user._id);
    const addressToUpdate = user.addresses.id(addressId);

    if (!addressToUpdate) {
      return res.status(HttpStatus.NOT_FOUND).send("Address not found");
    }

    addressToUpdate.fullName = name;
    addressToUpdate.mobile = mobile;
    addressToUpdate.pincode = pincode;
    addressToUpdate.state = state;
    addressToUpdate.address = address;
    addressToUpdate.city = city;
    addressToUpdate.type = type;

    await user.save();

    res.render("my account/address", {
      title: "Address",
      message: "Address updated successfully!",
      user,
      layout: false,
      addresses: user.addresses,
    });
  } catch (err) {
    console.error("Error updating address:", err);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .render("my account/edit-address", {
        message:
          "An error occurred while updating the address. Please try again.",
        address: { ...req.body },
        user: req.user,
        layout: false,
      });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.user._id;

    const user = await User.findOne({
      _id: userId,
      "addresses._id": addressId,
    });

    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: "Address not found or user does not exist.",
      });
    }

    await User.updateOne(
      { _id: userId },
      { $pull: { addresses: { _id: addressId } } }
    );

    res.json({ success: true, message: "Address deleted successfully!" });
  } catch (err) {
    console.error("Error deleting address:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while deleting the address.",
    });
  }
};

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const user = await User.findById(userId)
      .select("name addresses mobile")
      .lean();
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).send("User not found");
    }

    const addresses =
      user.addresses && user.addresses.length > 0 ? user.addresses : null;

    const cart = await Cart.findOne({ user: userId })
      .populate("items.productId", "product_name discount_price stock")
      .lean();
    if (!cart || cart.items.length === 0) {
      return res.render("my account/checkout", {
        user: {
          name: user.name,
          addresses,
          phone: user.mobile,
        },
        products: [],
        totalPrice: 0,
        deliveryCharges: 0,
        totalAmount: 0,
        coupons: [],
      });
    }

    const hasExceedingQuantity = await Promise.any(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.productId._id).select(
          "leftStock"
        );
        return item.quantity > (product ? product.leftStock : 0);
      })
    );

    if (hasExceedingQuantity) {
      req.session.cartError =
        "Cart contains items with quantity exceeding available stock. We are adjusted your cart. Now you can proceed to checkout.";
      return res.redirect(URLs.USER_CART);
    }

    const products = cart.items.map((item) => ({
      ...item.productId,
      quantity: item.quantity,
      totalPrice: item.productId.discount_price * item.quantity,
    }));

    const totalPrice = products.reduce(
      (total, product) => total + product.totalPrice,
      0
    );
    const deliveryCharges = 0;
    const totalAmount = totalPrice + deliveryCharges;

    const today = new Date();
    const coupons = await Coupon.find({
      status: "active",
      validFrom: { $lte: today },
      validUntil: { $gte: today },
      minPurchase: { $lte: totalPrice },
    }).lean();

    res.render("my account/checkout", {
      user: {
        name: user.name,
        addresses,
        phone: user.mobile,
      },
      products,
      totalPrice,
      deliveryCharges,
      totalAmount,
      coupons,
    });
  } catch (error) {
    console.error("Error fetching checkout data:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { code } = req.query;
    const today = new Date();

    const coupon = await Coupon.findOne({
      code,
      status: "active",
      validFrom: { $lte: today },
      validUntil: { $gte: today },
    });

    if (!coupon) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Invalid or expired coupon." });
    }

    const cart = await Cart.findOne({ user: req.session.user._id })
      .populate("items.productId", "discount_price")
      .lean();
    if (!cart) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ message: "Cart not found." });
    }

    const totalPrice = cart.items.reduce(
      (total, item) => total + item.productId.discount_price * item.quantity,
      0
    );

    let discount = 0;
    if (coupon.type === "percentage") {
      discount = (coupon.discount / 100) * totalPrice;
    } else if (coupon.type === "fixed") {
      discount = coupon.discount;
    }

    const totalAmount = totalPrice - discount;

    res.json({
      message: `${coupon.discount}${
        coupon.type === "percentage" ? "%" : "₹"
      } discount applied!`,
      discount,
      totalAmount,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.session.user._id })
      .populate("items.productId", "discount_price")
      .lean();
    if (!cart) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ message: "Cart not found." });
    }

    const totalPrice = cart.items.reduce(
      (total, item) => total + item.productId.discount_price * item.quantity,
      0
    );

    return res.json({
      success: true,
      message: "Coupon removed successfully!",
      totalAmount: totalPrice,
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred. Please try again." });
  }
};

const notifyUser = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ message: "Email is required" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "fathu6214@gmail.com",
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: "fathu6214@gmail.com",
      to: email,
      subject: "Product Notification",
      text: "Thank you for your interest! We will notify you when the product becomes available.",
    };

    await transporter.sendMail(mailOptions);

    res
      .status(HttpStatus.OK)
      .json({ message: "Notification email sent successfully" });
  } catch (err) {
    console.error("Error sending email:", err);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to send notification email" });
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
  searchProducts,
  getProductsPage,
  loadMyAccount,
  loadEditProfile,
  loadAddressPage,
  updateUserProfile,
  addNewAddress,
  getEditAddressForm,
  updateAddress,
  deleteAddress,
  loadCheckout,
  notifyUser,
  applyCoupon,
  removeCoupon,
};
