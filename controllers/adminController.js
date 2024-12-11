const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const User = require("../models/user");
const Order = require("../models/order");
const Wallet = require("../models/wallet");
const Category = require("../models/categories");
const Product = require("../models/product");
const Offer = require("../models/offerModel");
const Coupon = require("../models/coupon");

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

// const loadDashboard = (req, res) => {
//   res.render("admin/dashboard", { layout: false, admin: req.session.admin });
// };

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

const loadDashboard = async (req, res) => {
  try {
    let totalRevenue = 0;

    try {
      const result = await Order.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
      ]);

      totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;

      console.log(`Total Revenue: ${totalRevenue}`);
    } catch (error) {
      console.error("Error calculating total revenue:", error);
    }

    const orderCount = await Order.countDocuments();
    console.log(`Total orders: ${orderCount}`);

    const productCount = await Product.countDocuments({ isDeleted: false });
    console.log(`Total products: ${productCount}`);
    const products = await Product.find({ isDeleted: false });

    const categories = await Category.find({ isDeleted: false }).select(
      "name -_id"
    );

    let monthlyEarning = 0;

    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const result = await Order.aggregate([
        {
          $match: {
            status: { $ne: "Cancelled" },
            createdAt: {
              $gte: new Date(currentYear, currentMonth, 1),
              $lt: new Date(currentYear, currentMonth + 1, 1),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]);

      monthlyEarning = result.length > 0 ? result[0].total : 0;

      console.log(`Monthly Earning: ₹${monthlyEarning}`);
    } catch (error) {
      console.error("Error calculating monthly earning:", error);
    }

    let totalSales = 0;
    let totalDiscounts = 0;
    let totalCoupons = 0;
    let netSales = 0;

    let sales = [];

    try {
      const salesData = await Order.aggregate([
        {
          $match: {
            status: { $ne: "Cancelled" },
          },
        },

        {
          $project: {
            orderId: 1,
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalAmount: 1,
            subtotal: 1,
            discount: { $ifNull: ["$totalDiscounts", 0] },
            coupon: { $ifNull: ["$totalCoupons", 0] },
            total: {
              $add: [
                { $ifNull: ["$totalAmount", 0] },
                { $ifNull: ["$totalDiscounts", 0] },
                { $ifNull: ["$totalCoupons", 0] },
              ],
            },
            paymentStatus: 1,
          },
        },
      ]);

      totalSales = salesData.reduce((acc, sale) => acc + sale.totalAmount, 0);
      totalDiscounts = salesData.reduce((acc, sale) => acc + sale.discount, 0);
      totalCoupons = salesData.reduce((acc, sale) => acc + sale.coupon, 0);
      netSales = totalSales - totalDiscounts - totalCoupons;

      sales = salesData;

      console.log(`Total Sales: ₹${totalSales}`);
      console.log(`Total Discounts: ₹${totalDiscounts}`);
      console.log(`Total Coupons: ₹${totalCoupons}`);
      console.log(`Net Sales: ₹${netSales}`);
    } catch (error) {
      console.error("Error calculating sales data:", error);
    }

    const chartLabels = ["January", "February", "March", "April"];
    const chartData = [500, 700, 800, 600];

    const categoryNames = categories.map((category) => category.name);
    let newMembers = [];

    try {
      newMembers = await User.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .select("name createdAt email");

      console.log("Last Joined Users:", newMembers);
    } catch (error) {
      console.error("Error fetching last joined users:", error);
    }

    const activities = [];

    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(2)
      .select("orderId createdAt");
    recentOrders.forEach((order) => {
      activities.push({
        description: `New order placed: Order ID ${order.orderId}`,
        active: true,
      });
    });

    const recentProducts = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(2)
      .select("product_name createdAt");
    recentProducts.forEach((product) => {
      activities.push({
        description: `Product added: ${product.product_name}`,
        active: false,
      });
    });

    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(2)
      .select("name createdAt");
    recentUsers.forEach((user) => {
      activities.push({
        description: `New user joined: ${user.name || "Unknown"}`,
        active: false,
      });
    });

    const totalPages = 5;
    const currentPage = 1;

    res.render("admin/dashboard", {
      layout: false,
      totalRevenue,
      orderCount,
      chartLabels,
      chartData,
      productCount,
      products,
      categories: categoryNames,
      monthlyEarning,
      newMembers,
      activities,
      totalPages,
      currentPage,
      dateValue: new Date().toISOString().split("T")[0],
      totalSales,
      totalDiscounts,
      totalCoupons,
      netSales,
      sales,
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.status(500).send("Internal Server Error");
  }
};

const generateSalesReport = async (req, res) => {
  const { type, startDate, endDate } = req.query;
  let matchCriteria = {};
  const today = new Date();

  switch (type) {
    case "daily":
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      matchCriteria = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
      break;
    case "weekly":
      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      matchCriteria = { createdAt: { $gte: startOfWeek, $lte: endOfWeek } };
      break;
    case "monthly":
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      matchCriteria = { createdAt: { $gte: startOfMonth, $lte: endOfMonth } };
      break;
    case "yearly":
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      matchCriteria = { createdAt: { $gte: startOfYear, $lte: endOfYear } };
      break;
    case "custom":
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        matchCriteria = { createdAt: { $gte: start, $lte: end } };
      } else {
        return res
          .status(400)
          .json({
            message: "Custom date range requires both startDate and endDate",
          });
      }
      break;
    default:
      return res.status(400).json({ message: "Invalid report type" });
  }

  try {
    const salesData = await Order.aggregate([
      { $match: { ...matchCriteria, status: { $ne: "Cancelled" } } },
      {
        $project: {
          orderId: 1,
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalAmount: 1,
          subtotal: 1,
          discount: { $ifNull: ["$totalDiscounts", 0] },
          coupon: { $ifNull: ["$totalCoupons", 0] },
          total: {
            $add: [
              { $ifNull: ["$totalAmount", 0] },
              { $ifNull: ["$totalDiscounts", 0] },
              { $ifNull: ["$totalCoupons", 0] },
            ],
          },
          paymentStatus: 1,
        },
      },
    ]);

    let totalSales = 0;
    let totalDiscounts = 0;
    let totalCoupons = 0;
    let netSales = 0;

    totalSales = salesData.reduce((acc, sale) => acc + sale.totalAmount, 0);
    totalDiscounts = salesData.reduce((acc, sale) => acc + sale.discount, 0);
    totalCoupons = salesData.reduce((acc, sale) => acc + sale.coupon, 0);
    netSales = totalSales - totalDiscounts - totalCoupons;

    if (salesData.length === 0) {
      return res.json({
        totalSales: 0,
        totalDiscounts: 0,
        totalCoupons: 0,
        netSales: 0,
        sales: [],
      });
    }

    const reportData = {
      totalSales,
      totalDiscounts,
      totalCoupons,
      netSales,
      sales: salesData,
    };

    console.log(`Total Sales: ₹${totalSales}`);
    console.log(`Total Discounts: ₹${totalDiscounts}`);
    console.log(`Total Coupons: ₹${totalCoupons}`);
    console.log(`Net Sales: ₹${netSales}`);

    res.json(reportData);
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({ message: "Error fetching sales data", error });
  }
};

const loadSalesData = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.page) || 1;
    const perPage = 10;
    const salesData = await Order.aggregate([
      { $match: { status: { $ne: "Cancelled" } } },
      {
        $project: {
          orderId: 1,
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalAmount: 1,
          subtotal: 1,
          discount: { $ifNull: ["$totalDiscounts", 0] },
          coupon: { $ifNull: ["$totalCoupons", 0] },
          total: {
            $add: [
              { $ifNull: ["$totalAmount", 0] },
              { $ifNull: ["$totalDiscounts", 0] },
              { $ifNull: ["$totalCoupons", 0] },
            ],
          },
          paymentStatus: 1,
        },
      },
    ]);

    const totalSales = salesData.reduce(
      (acc, sale) => acc + sale.totalAmount,
      0
    );
    const totalDiscounts = salesData.reduce(
      (acc, sale) => acc + sale.discount,
      0
    );
    const totalCoupons = salesData.reduce((acc, sale) => acc + sale.coupon, 0);
    const netSales = totalSales - totalDiscounts - totalCoupons;

    const totalPages = Math.ceil(salesData.length / perPage);
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedSales = salesData.slice(startIndex, endIndex);

    res.json({
      totalSales,
      totalDiscounts,
      totalCoupons,
      netSales,
      sales: paginatedSales,
      totalPages,
      currentPage,
    });
  } catch (error) {
    console.error("Error loading sales data:", error);
    res.status(500).send("Internal Server Error");
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
  loadDashboard,
  generateSalesReport,
  loadSalesData,
};
