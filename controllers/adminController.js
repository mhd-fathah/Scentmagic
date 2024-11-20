const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const User = require("../models/user");

const loadLoginPage = (req, res) => {
  const errorMessage = req.session.error || null;
  const message = req.session.message || null;
  req.session.error = null;
  req.session.message = null;
  res.render("admin/admin-login", {
    error: errorMessage,
    message: message,
    layout: false,
  });
};

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      req.session.error = "Invalid email or password";
      return res.redirect("/admin/login");
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      req.session.error = "Invalid email or password";
      return res.redirect("/admin/login");
    }

    req.session.admin = admin;
    res.redirect("/admin/dashboard");
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
    res.clearCookie("connect.sid");
    res.redirect("/admin/login");
  });
};

const listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const totalUsers = await User.countDocuments();

    const users = await User.find()
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(totalUsers / limit);

    res.render("admin/user-management", {
      users,
      currentPage: page,
      totalPages: totalPages,
      layout: false,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { isBlocked: true });
    res.redirect("/admin/users");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

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

const viewUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("admin/user-details", { user, layout: false });
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
  viewUserDetails,
};
