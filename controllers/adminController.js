const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const User = require("../models/user");
const Order = require("../models/order");
const Wallet = require("../models/wallet");
const Category = require("../models/categories");
const Product = require("../models/product");
const Offer = require("../models/offerModel");
const Coupon = require("../models/coupon");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const HttpStatus = require('../constants/httpStatus')
const Messages = require('../constants/messages')
const URLs = require('../constants/urls')

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
      return res.redirect(URLs.ADMIN_LOGIN);
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      req.session.error = "Invalid email or password";
      return res.redirect(URLs.ADMIN_LOGIN);
    }

    req.session.admin = admin;
    res.redirect(URLs.ADMIN_DASHBOARD);
  } catch (err) {
    console.error(err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
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
    res.redirect(URLs.ADMIN_LOGIN);
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
  }
};

const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { isBlocked: true });
    res.redirect(URLs.ADMIN_USERS);
  } catch (error) {
    console.error(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
  }
};

const unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { isBlocked: false });
    res.redirect(URLs.ADMIN_USERS);
  } catch (error) {
    console.error(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
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
      cancellationReason: order.cancellationReason || null, 
      returnReason: order.returnReason || null, 
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;

  try {
    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: "Order not found" });
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

    res.status(HttpStatus.OK).json({ message: "Order status updated successfully!" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server Error" });
  }
};

const approveReturn = async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findOne({ orderId });

    console.log(order);
    if (!order) {
      return res
        .status(HttpStatus.NOT_FOUND)
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
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: "User not found" });
    }

    const wallet = await Wallet.findOne({ userId: order.userId });
    if (!wallet) {
      return res
        .status(HttpStatus.NOT_FOUND)
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};

const rejectReturn = async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).send("Order not found");
    }

    if (order.status !== "Return Requested") {
      return res.status(HttpStatus.BAD_REQUEST).send("No return request found for this order");
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
  }
};

const loadDashboard = async (req, res) => {
  try {
    let totalRevenue = 0;

    try {
      const result = await Order.aggregate([
        { $match: { status: { $ne: "Cancelled" } , paymentStatus:{$eq:"Paid"},} },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
      ]);

      totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;

    } catch (error) {
      console.error("Error calculating total revenue:", error);
    }

    const orderCount = await Order.countDocuments();

    const productCount = await Product.countDocuments({ isDeleted: false });
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
            paymentStatus:{$eq:"Paid"},
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
            paymentStatus:{$eq:"Paid"},
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const loadSalesReport = async (req, res) => {
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
          paymentStatus: "Paid",
        },
      },
      {
        $lookup: {
          from: "users", 
          localField: "userId", 
          foreignField: "_id", 
          as: "userDetails",
        },
      },
      {
        $lookup: {
          from: "products", 
          localField: "productId", 
          foreignField: "_id", 
          as: "productDetails",
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
          paymentMethod: 1,
          userName: { $arrayElemAt: ["$userDetails.name", 0] }, 
          productName: { $arrayElemAt: ["$productDetails.product_name", 0] },
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

    res.render('admin/sales-report', { sales, layout: false });
  } catch (error) {
    console.error("Error calculating sales data:", error);
  }
};



const generateSalesReport = async (req, res) => {
  const { reportType, startDate, endDate } = req.body;
  console.log(`report type ${reportType} , start date : ${startDate} , end date : ${endDate}`);
  let matchCriteria = {};
  const today = new Date();

  switch (reportType) {
    case "daily":
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      matchCriteria = { createdAt: { $gte: startOfDay, $lte: endOfDay }, paymentStatus: "Paid" }; 
      break;
    case "weekly":
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      matchCriteria = { createdAt: { $gte: startOfWeek, $lte: endOfWeek }, paymentStatus: "Paid" }; 
      break;
    case "monthly":
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      matchCriteria = { createdAt: { $gte: startOfMonth, $lte: endOfMonth }, paymentStatus: "Paid" }; 
      break;
    case "yearly":
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      matchCriteria = { createdAt: { $gte: startOfYear, $lte: endOfYear }, paymentStatus: "Paid" }; 
      break;
    case "custom":
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        matchCriteria = { createdAt: { $gte: start, $lte: end }, paymentStatus: "Paid" }; 
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "Custom date range requires both startDate and endDate",
        });
      }
      break;
    default:
      return res.status(HttpStatus.BAD_REQUEST).json({ message: "Invalid report type" });
  }

  try {
    const salesData = await Order.aggregate([
      { $match: { ...matchCriteria, status: { $ne: "Cancelled" } } },
      {
        $lookup: {
          from: "users", 
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: "$userDetails"
      },
      {
        $lookup: {
          from: "products", 
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails"
        }
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
          paymentMethod: 1, 
          userName: { $concat: ["$userDetails.name"] }, 
          productNames: { $map: { input: "$productDetails", as: "product", in: "$$product.product_name" } } 
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

    res.json(reportData);
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Error fetching sales data", error });
  }
};



const fetchSalesReportData = async (reportType, startDate, endDate, res) => {
  let matchCriteria = {
    status: { $ne: 'Cancelled' },
    paymentStatus: "Paid",  
  };

  const today = new Date();

  switch (reportType) {
    case "daily":
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      matchCriteria = { createdAt: { $gte: startOfDay, $lte: endOfDay }, paymentStatus: "Paid" };
      break;
    case "weekly":
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      matchCriteria = { createdAt: { $gte: startOfWeek, $lte: endOfWeek }, paymentStatus: "Paid" };
      break;
    case "monthly":
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      matchCriteria = { createdAt: { $gte: startOfMonth, $lte: endOfMonth }, paymentStatus: "Paid" };
      break;
    case "yearly":
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      matchCriteria = { createdAt: { $gte: startOfYear, $lte: endOfYear }, paymentStatus: "Paid" };
      break;
    case "custom":
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        matchCriteria = { createdAt: { $gte: start, $lte: end }, paymentStatus: "Paid" };
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "Custom date range requires both startDate and endDate",
        });
      }
      break;
    default:
      return res.status(HttpStatus.BAD_REQUEST).json({ message: "Invalid report type" });
  }

  try {
    const salesData = await Order.aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: "users", 
          localField: "userId", 
          foreignField: "_id", 
          as: "userDetails",
        },
      },
      {
        $lookup: {
          from: "products", 
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $project: {
          orderId: 1,
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalAmount: 1,
          discount: { $ifNull: ["$totalDiscounts", 0] },
          coupon: { $ifNull: ["$totalCoupons", 0] },
          paymentStatus: 1,
          paymentMethod: 1, 
          userName: { $arrayElemAt: ["$userDetails.name", 0] },
          productNames: { $map: { input: "$productDetails", as: "product", in: "$$product.product_name" } } 
        },
      },
    ]);

    

    const totalSales = salesData.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalDiscounts = salesData.reduce((sum, sale) => sum + sale.discount, 0);
    const totalCoupons = salesData.reduce((sum, sale) => sum + sale.coupon, 0);
    const netSales = totalSales - totalDiscounts - totalCoupons;

    return {
      salesData,
      summary: {
        totalSales,
        totalDiscounts,
        totalCoupons,
        netSales,
      },
    };
  } catch (error) {
    console.error("Error fetching sales report data:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Error fetching sales data", error });
  }
};



const generatePdfReport = async (req, res) => {
  const { reportType, startDate, endDate } = req.body;

  try {
    const { salesData, summary } = await fetchSalesReportData(reportType, startDate, endDate);

    const doc = new PDFDocument({ margin: 50, size: [1850, 842] });
    res.setHeader('Content-Type', 'application/pdf');

    const fileName = reportType
      ? `scentmagic-sales-report-${reportType}.pdf`
      : `scentmagic-sales-report-${startDate}-to-${endDate}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    const rupeeFontPath = path.join(__dirname, '..', 'public', 'fonts', 'NotoSans-Regular.ttf');
    doc.registerFont('NotoSans', rupeeFontPath);

    const tableTop = 150;
    const rowHeight = 25; 
    const colWidths = {
      orderId: 150,
      date: 150,
      amount: 250,
      discount: 150, 
      coupon: 150,
      paymentStatus: 200, 
      paymentMethod: 200,
      userName: 200, 
      productName: 300, 
    };
    const pageHeight = 750;
    let yPosition = tableTop;

    const addHeader = () => {
      doc
        .font('NotoSans')
        .fontSize(20)
        .fillColor('#333333')
        .text('Scentmagic Sales Report', { align: 'center' })
        .moveDown(0.5);
    
      doc
        .fontSize(12)
        .fillColor('#000000')
        .text(reportType ? `Report Type: ${reportType}` : `From: ${startDate} To: ${endDate}`)
        .text(`Net Sales: ₹${summary.netSales}`)
        .text(`Total Discounts: ₹${summary.totalDiscounts}`)
        .moveDown(1);
    };

    const drawTableHeaders = () => {
      doc
        .fontSize(10)
        .fillColor('#FFFFFF')
        .rect(50, yPosition, 1790, rowHeight) 
        .fill('#007BFF');

      doc
        .fillColor('#FFFFFF')
        .text('Order ID', 50, yPosition + 5, { width: colWidths.orderId, align: 'left' })
        .text('Date', 50 + colWidths.orderId, yPosition + 5, { width: colWidths.date, align: 'left' })
        .text('Amount', 50 + colWidths.orderId + colWidths.date, yPosition + 5, { width: colWidths.amount, align: 'right' })
        .text('Discount', 50 + colWidths.orderId + colWidths.date + colWidths.amount, yPosition + 5, { width: colWidths.discount, align: 'right' })
        .text('Coupon', 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount, yPosition + 5, { width: colWidths.coupon, align: 'right' })
        .text('Payment Status', 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount + colWidths.coupon, yPosition + 5, { width: colWidths.paymentStatus, align: 'right' })
        .text('Payment Method', 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount + colWidths.coupon + colWidths.paymentStatus, yPosition + 5, { width: colWidths.paymentMethod, align: 'right' })
        .text('User Name', 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount + colWidths.coupon + colWidths.paymentStatus + colWidths.paymentMethod, yPosition + 5, { width: colWidths.userName, align: 'right' })
        .text('Product Name', 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount + colWidths.coupon + colWidths.paymentStatus + colWidths.paymentMethod + colWidths.userName, yPosition + 5, { width: colWidths.productName, align: 'right' });

      yPosition += rowHeight;
    };

    const drawTableRow = (sale) => {
      doc
        .fontSize(10)
        .fillColor('#000000')
        .text(sale.orderId, 50, yPosition + 5, { width: colWidths.orderId, align: 'left' })
        .text(sale.date, 50 + colWidths.orderId, yPosition + 5, { width: colWidths.date, align: 'left' })
        .text(`₹${sale.totalAmount}`, 50 + colWidths.orderId + colWidths.date, yPosition + 5, { width: colWidths.amount, align: 'right' })
        .text(`₹${sale.discount}`, 50 + colWidths.orderId + colWidths.date + colWidths.amount, yPosition + 5, { width: colWidths.discount, align: 'right' })
        .text(sale.coupon || '-', 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount, yPosition + 5, { width: colWidths.coupon, align: 'right' })
        .text(sale.paymentStatus, 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount + colWidths.coupon, yPosition + 5, { width: colWidths.paymentStatus, align: 'right' })
        .text(sale.paymentMethod, 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount + colWidths.coupon + colWidths.paymentStatus, yPosition + 5, { width: colWidths.paymentMethod, align: 'right' })
        .text(sale.userName, 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount + colWidths.coupon + colWidths.paymentStatus + colWidths.paymentMethod, yPosition + 5, { width: colWidths.userName, align: 'right' })
        .text(sale.productNames, 50 + colWidths.orderId + colWidths.date + colWidths.amount + colWidths.discount + colWidths.coupon + colWidths.paymentStatus + colWidths.paymentMethod + colWidths.userName, yPosition + 5, { width: colWidths.productName, align: 'right' });

      yPosition += rowHeight;
    };

    const checkAndAddPage = () => {
      if (yPosition + rowHeight > pageHeight) {
        doc.addPage();
        yPosition = 50;
      }
    };

    addHeader();
    drawTableHeaders();

    salesData.forEach((sale) => {
      checkAndAddPage();
      drawTableRow(sale);
    });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to generate PDF', error });
  }
};





const generateExcelReport = async (req, res) => {
  const { reportType, startDate, endDate } = req.body;

  try {
    const { salesData, summary } = await fetchSalesReportData(reportType, startDate, endDate);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.mergeCells('A1:I1');
    worksheet.getCell('A1').value = 'Scentmagic Sales Report';
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A1').font = { size: 20, bold: true };

    worksheet.addRow([]);
    worksheet.addRow([reportType ? `Report Type: ${reportType}` : `From: ${startDate} To: ${endDate}`]);
    worksheet.addRow([`Net Sales: ₹${summary.netSales}`]);
    worksheet.addRow([`Total Discounts: ₹${summary.totalDiscounts}`]);
    worksheet.addRow([]);

    worksheet.addRow([
      'Order ID',
      'Date',
      'Total Amount',
      'Discount',
      'Coupon',
      'Payment Status',
      'Payment Method',
      'User Name',
      'Product Names',
    ]);

    const headerRow = worksheet.getRow(worksheet.lastRow.number);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF007BFF' },
        bgColor: { argb: 'FFFFFFFF' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    salesData.forEach((sale) => {
      worksheet.addRow([
        sale.orderId,
        sale.date,
        `₹${sale.totalAmount}`,
        `₹${sale.discount}`,
        sale.coupon || '-',
        sale.paymentStatus,
        sale.paymentMethod,
        sale.userName,
        sale.productNames,
      ]);
    });

    worksheet.columns.forEach((column) => {
      column.width = column.header ? column.header.length + 5 : 15;
    });

    const fileName = reportType
      ? `scentmagic-sales-report-${reportType}.xlsx`
      : `scentmagic-sales-report-${startDate}-to-${endDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to generate Excel file', error });
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


const getTopSellingProducts = async (req, res) => {
  try {
    const filter = req.query.filter || "all";
    const matchStage = {};

    if (filter === "yearly") {
      matchStage.createdAt = {
        $gte: new Date(new Date().getFullYear(), 0, 1),
        $lt: new Date(new Date().getFullYear() + 1, 0, 1),
      };
    } else if (filter === "monthly") {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      matchStage.createdAt = { $gte: startOfMonth, $lt: endOfMonth };
    } else if (filter === "weekly") {
      const currentDate = new Date();
      const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      matchStage.createdAt = { $gte: startOfWeek, $lt: endOfWeek };
    }

    const topProducts = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalQuantity: { $sum: "$products.quantity" },
          totalSales: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);

    const populatedProducts = await Product.populate(topProducts, {
      path: "_id",
      select: "product_name",
    });

    res.status(200).json({
      success: true,
      data: populatedProducts.map((product) => ({
        productId: product._id._id,
        name: product._id.product_name,
        quantity: product.totalQuantity,
        sales: product.totalSales,
      })),
    });
  } catch (error) {
    console.error("Error fetching top-selling products:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: "Internal Server Error" });
  }
};

const getTopSellingCategories = async (req, res) => {
  try {
    const filter = req.query.filter || "all";
    const matchStage = {};

    if (filter === "yearly") {
      matchStage.createdAt = {
        $gte: new Date(new Date().getFullYear(), 0, 1),
        $lt: new Date(new Date().getFullYear() + 1, 0, 1),
      };
    } else if (filter === "monthly") {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      matchStage.createdAt = { $gte: startOfMonth, $lt: endOfMonth };
    } else if (filter === "weekly") {
      const currentDate = new Date();
      const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      matchStage.createdAt = { $gte: startOfWeek, $lt: endOfWeek };
    }

    const topCategories = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.category",
          totalQuantity: { $sum: "$products.quantity" },
          totalSales: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);

    res.status(HttpStatus.OK).json({
      success: true,
      data: topCategories.map((category) => ({
        categoryId: category._id,
        categoryName: category.categoryDetails.name,
        quantity: category.totalQuantity,
        sales: category.totalSales,
      })),
    });
  } catch (error) {
    console.error("Error fetching top-selling categories:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: "Internal Server Error" });
  }
}


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
  loadSalesReport,
  generatePdfReport,
  generateExcelReport,
  getTopSellingProducts,
  getTopSellingCategories
};
