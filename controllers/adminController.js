const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const User = require("../models/user");


const loadLoginPage = (req, res) => {
  const errorMessage = req.session.error || null;
  const message = req.session.message || null;
  req.session.error = null; // Clear error message
  req.session.message = null; // Clear success message
  res.render("admin/admin-login", {
    error: errorMessage,
    message: message,
    layout: false,
  });
};

// Controller function to handle login
const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      req.session.error = "Invalid email or password"; // Set error in session
      return res.redirect("/admin/login"); // Redirect back to the login page
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      req.session.error = "Invalid email or password"; // Set error in session
      return res.redirect("/admin/login"); // Redirect back to the login page
    }

    req.session.admin = admin; // Store admin in session
    res.redirect("/admin/dashboard"); // Redirect to the dashboard
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

const loadDashboard = (req, res) => {
  res.render("admin/dashboard", { layout: false, admin: req.session.admin });
};

const logoutAdmin = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error during logout");
    }
    res.clearCookie("connect.sid"); // Clear session cookie
    res.redirect("/admin/login");
  });
};

// Fetch all users
const listUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.render("admin/user-management", { users, layout: false }); // Render the view
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

// Block a user
const blockUser = async (req, res) => {
  try {
    const userId = req.params.id; // User ID from URL
    await User.findByIdAndUpdate(userId, { isBlocked: true }); // Update the status
    res.redirect("/admin/users"); // Redirect to users page
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

// Unblock a user
const unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { isBlocked: false });
    res.redirect("/admin/users");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};



module.exports = {
  loadLoginPage,
  handleLogin,
  loadDashboard,
  logoutAdmin,
  listUsers,
  blockUser,
  unblockUser,
};
