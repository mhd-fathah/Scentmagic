const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const User = require("../models/user");
const Order = require("../models/order");
const Wallet = require("../models/wallet");

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
      .sort({ createdAt: -1 })
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

const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("admin/orders", {
      layout: false,
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Server Error");
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findOne({ orderId })
      .populate("userId", "name email")
      .populate("products.productId", "image")
      .lean();

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const totalAmount = parseFloat(order.totalAmount);
    const formattedTotalAmount = isNaN(totalAmount)
      ? 0.0
      : totalAmount.toFixed(2);

    const orderDetails = {
      orderId: order.orderId,
      date: order.createdAt.toLocaleString(),
      customer: {
        name: order.userId?.name || "Unknown",
        email: order.userId?.email || "No Email",
      },
      deliveryAddress: {
        fullName: order.deliveryAddress.fullName,
        mobile: order.deliveryAddress.mobile,
        pincode: order.deliveryAddress.pincode,
        state: order.deliveryAddress.state,
        address: order.deliveryAddress.address,
        city: order.deliveryAddress.city,
      },
      paymentMethod: order.paymentMethod || "Not Specified",
      totalAmount: formattedTotalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      products: order.products.map((product) => ({
        name: product.name,
        quantity: product.quantity,
        price: parseFloat(product.price),
        image: product.productId?.image || "/images/default-product.png",
      })),
    };

    res.render("admin/order-details", { layout: false, order: orderDetails });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Server Error");
  }
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;

  try {
    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;

    if (status === "Delivered") {
      order.paymentStatus = "Paid";
    } else if (status === "Cancelled") {
      order.paymentStatus = "Unpaid";
    } else if (status === "Returned") {
      order.paymentStatus = "Refunded";
    } else {
      order.paymentStatus = "Pending";
    }

    await order.save();

    res.status(200).json({ message: "Order status updated successfully!" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const approveReturn = async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findOne({ orderId });

    console.log(order);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.status !== "Return Requested") {
      return res.status(400).json({
        success: false,
        message: "No return request found for this order",
      });
    }

    const user = await User.findById(order.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const wallet = await Wallet.findOne({ userId: order.userId });
    if (!wallet) {
      return res
        .status(404)
        .json({ success: false, message: "Wallet not found for this user" });
    }

    wallet.balance += order.totalAmount;

    wallet.transactions.push({
      id: `txn_${Date.now()}`,
      type: "Refund",
      amount: order.totalAmount,
      date: new Date(),
    });

    await wallet.save();

    order.status = "Returned";
    order.paymentStatus = "Refunded";
    order.returnRequested = false;
    await order.save();

    res.json({
      success: true,
      message: "Return Approved and Refund Processed",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const rejectReturn = async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (order.status !== "Return Requested") {
      return res.status(400).send("No return request found for this order");
    }

    order.status = "Delivered";
    order.returnRequested = false;
    await order.save();
    res.json({
      success: true,
      message: "Return Rejected !",
    });
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
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  approveReturn,
  rejectReturn,
};
