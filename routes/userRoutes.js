const express = require("express")
const router = express.Router()
const userController = require('../controllers/userController')
const auth = require("../middleware/authMiddleware")

router.get("/login", auth.isLogin, userController.loadLogin);
router.post("/login", userController.loginUser);
router.get("/signup", auth.isLogin, userController.loadSignup);
router.post("/signup", userController.signupUser);

router.get("/", auth.checkSession, userController.loadHome);
router.get("/logout", auth.checkSession, userController.logout);

router.get('/verify-otp', (req, res) => res.render('verify-otp', { layout: false }));
router.post('/verify-otp', userController.verifyOTP);
router.post("/resend-otp", auth.checkSession, userController.resendOTP);

router.get("/auth/google", userController.googleAuth);
router.get("/auth/google/callback", userController.googleAuthCallback);

module.exports = router