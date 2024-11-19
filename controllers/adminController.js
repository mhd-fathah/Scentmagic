const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const User = require("../models/user");
const { search } = require("../routes/adminRoutes");


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
    // Get the current page and limit (defaults to 1 page, 10 users per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Get the total number of users in the database
    const totalUsers = await User.countDocuments();
    
    // Fetch the users with pagination
    const users = await User.find()
      .skip((page - 1) * limit) // Skip users based on the page number
      .limit(limit); // Limit the number of users per page
    
    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / limit);
    
    // Render the page with users and pagination data
    res.render("admin/user-management", {
      users,
      currentPage: page,
      totalPages: totalPages,
      layout: false
    });
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



const viewUserDetails = async (req, res) => {
  try {
    const userId = req.params.id; // Get the user ID from the URL params
    const user = await User.findById(userId); // Fetch user details by ID

    if (!user) {
      return res.status(404).send("User not found"); // Return 404 if the user is not found
    }

    // Render the user details page, passing the user object to the view
    res.render('admin/user-details', { user, layout: false });
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
  viewUserDetails
};
