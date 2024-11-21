const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/authMiddleware");


router.use(auth.setAuthStatus);

router.get("/login", auth.isLogin, userController.loadLogin);
router.post("/login", userController.loginUser);
router.get("/signup", auth.isLogin, userController.loadSignup);
router.post("/signup", userController.signupUser);

router.get("/", auth.checkBlocked, userController.loadHome);
router.get("/logout", auth.checkSession, userController.logout);

router.get("/verify-otp", (req, res) =>
  res.render("verify-otp", { layout: false })
);
router.post("/verify-otp", userController.verifyOTP);
router.post("/resend-otp", auth.checkSession, userController.resendOTP);

router.get("/auth/google", userController.googleAuth);
router.get("/auth/google/callback", userController.googleAuthCallback);

router.post("/forgot-password", userController.forgotPassword);

router.get("/forgot-password", userController.loadForgotPassword);

router.get("/reset-password/:token", userController.loadResetPasswordForm);

router.post("/reset-password/:token", userController.resetPassword);

router.get("/banned", userController.getBannedPage);

router.get("/product/:id", auth.checkBlocked , userController.productDetails);

router.post("/add-review", auth.checkSession, userController.addReview);

// Newsletter subscription route
router.post("/subscribe", userController.subscribeNewsletter);

// Search route
router.get(
  "/search",
  auth.checkBlocked, 
  async (req, res) => {
    const query = req.query.q;

    if (!query) {
      return res.redirect("/");
    }

    try {
      const products = await userController.searchProducts(query);

      res.render("searchResults", { products, query, isDeleted: false });
    } catch (error) {
      console.error("Error during search:", error);
      res.status(500).send("There was an error processing the search request.");
    }
  }
);


module.exports = router;
