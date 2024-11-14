const User = require("../models/user");
const bcrypt = require("bcrypt");
const saltRound = 10;
const { sendOTPEmail, generateOTP } = require("../utils/otpService");

const signupUser = async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).render("signup", { layout: false, message: "Email already exists" });
    }

    const otp = generateOTP();
    await sendOTPEmail(email, otp);

    req.session.otp = otp;
    req.session.otpExpiresAt = Date.now() + 5 * 60 * 1000; 
    req.session.user = { name, mobile, email, password };
  
    res.render("verify-otp", { layout: false, message: "OTP sent to your email." });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).render("signup", { layout: false, message: "Internal Server Error" });
  }
};


const verifyOTP = async (req, res) => {
  const { otp } = req.body;
  

  if (!otp) {
    return res.render("verify-otp", { layout: false, message: "OTP is required." });
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
      message: "Invalid OTP. Please try again." 
    });
  }
};




const resendOTP = async (req, res) => {
  try {
    
    console.log("Resend OTP function called");

    const { email } = req.session.user || {};
    if (!email) {
      console.log("No email found in session.");
      return res.status(400).render("verify-otp", { layout: false, message: "User not logged in or email missing." });
    }

    console.log("Email for resend OTP:", email);

    const newOTP = generateOTP();
    console.log("Generated new OTP:", newOTP); 


    await sendOTPEmail(email, newOTP); 
    console.log("OTP sent successfully to:", email);

   
    req.session.otp = newOTP;
    req.session.lastOTPSend = Date.now();

    res.render("verify-otp", { layout: false, message: "A new OTP has been sent to your email." });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).render("verify-otp", { layout: false, message: "Failed to resend OTP." });
  }
};




const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .render("login", {
          layout: false,
          message: "Invalid email or password",
        });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res
        .status(400)
        .render("login", {
          layout: false,
          message: "Invalid email or password",
        });
    }

    req.session.user = user;
    console.log("Session after login:", req.session);

    res.render("home", { user, message: "Logged in successfully" });
  } catch (error) {
    console.error("Error during login:", error);
    res
      .status(500)
      .render("login", { layout: false, message: "Internal Server Error" });
  }
};

const logout = (req, res) => {
  req.session.user = null;
  req.session.message = "You are Successfully Logged Out.";
  res.redirect("/login");
};


const loadSignup = (req, res) => {
  try {
    res.render("signup", { layout: false , message:null});
  } catch (error) {
    console.error("Error loading signup page:", error);
    res.status(500).send("Error loading signup page");
  }
};

const loadLogin = (req, res) => {
  try {
    const message = req.session.message;
    req.session.message = null;
    res.render("login", { layout: false , message});
  } catch (error) {
    console.error("Error loading login page:", error);
    res.status(500).send("Error loading login page");
  }
};

const loadHome = (req, res) => {
  try {
    res.render("home");
  } catch (error) {
    console.error("Error loading home page:", error);
    res.status(500).send("Error loading home page");
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
  resendOTP
};
