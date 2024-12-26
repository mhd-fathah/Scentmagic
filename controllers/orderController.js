const Order = require("../models/order");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const User = require("../models/user");
const Product = require("../models/product");
const Cart = require("../models/cart");
const Wallet = require('../models/wallet')
const Razorpay = require("razorpay");
const Coupon = require('../models/coupon')
const crypto = require("crypto");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

const initiateOrder = async (req, res) => {
  try {
    const { paymentMethod, products, addressId, totalAmount } = req.body;
    const { couponCode } = req.query;
    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) {
      return res.status(400).json({ message: "Address not found" });
    }

    if (!products || !products.length) {
      return res.status(400).json({ message: "Products cannot be empty" });
    }

    const productIds = products.map((product) => product.productId);
    const productDetails = await Product.find({ _id: { $in: productIds } });

    if (!productDetails.length) {
      return res.status(400).json({ message: "Some products not found" });
    }

    const totalPrice = products.reduce((total, product) => {
      const productDetail = productDetails.find(
        (p) => p._id.toString() === product.productId.toString()
      );
      return total + (productDetail.discount_price || 0) * product.quantity;
    }, 0);

    let discount = 0;
    if (couponCode) {
      const today = new Date();
      const coupon = await Coupon.findOne({
        code: couponCode,
        status: "active",
        validFrom: { $lte: today },
        validUntil: { $gte: today },
      });

      if (!coupon) {
        return res.status(400).json({ message: "Invalid or expired coupon." });
      }

      if (coupon.type === "percentage") {
        discount = (coupon.discount / 100) * totalPrice;
      } else if (coupon.type === "fixed") {
        discount = coupon.discount;
      }
    }

    const finalTotalAmount = totalPrice - discount;
    console.log(finalTotalAmount)

    const orderId = `ORD-${Date.now()}`;
    let razorpayOrder = null;

    if (paymentMethod === "razorpay") {
      razorpayOrder = await razorpay.orders.create({
        amount: finalTotalAmount * 100, 
        currency: "INR",
        receipt: orderId,
      });

      if (!razorpayOrder) {
        return res.status(500).json({
          message: "Error creating Razorpay order. Please try again.",
        });
      }
    }

    const newOrder = new Order({
      orderId: orderId,
      userId: userId,
      products: products.map((product) => {
        const productDetail = productDetails.find(
          (p) => p._id.toString() === product.productId.toString()
        );
        return {
          productId: product.productId,
          quantity: product.quantity,
          price: productDetail.discount_price || 0,
          name: productDetail.product_name || "Unnamed Product",
        };
      }),
      deliveryAddress: {
        fullName: selectedAddress.fullName,
        mobile: selectedAddress.mobile,
        pincode: selectedAddress.pincode,
        state: selectedAddress.state,
        address: selectedAddress.address,
        city: selectedAddress.city,
      },
      paymentMethod: paymentMethod,
      totalAmount: finalTotalAmount,
      paymentStatus: paymentMethod === "razorpay" ? "Pending" : "Paid",
      orderStatus: "Pending",
      razorpayOrderId: razorpayOrder ? razorpayOrder.id : null,
      discount: discount,
      couponCode: couponCode || null,
    });

    const savedOrder = await newOrder.save();

    res.status(200).json({
      message: "Order created successfully",
      orderId: savedOrder._id,
      razorpayOrderId: razorpayOrder ? razorpayOrder.id : null,
      amount: finalTotalAmount,
      currency: "INR",
      discount: discount,
      paymentMethod: paymentMethod,
    });
  } catch (error) {
    console.error("Error initiating order:", error.message);
    res
      .status(500)
      .json({ message: "Failed to initiate order.", error: error.message });
  }
};


const confirmPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const userId = req.session.user?._id;

    const order = await Order.findOne({ razorpayOrderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpaySignature) {
      order.paymentStatus = "Paid";
      order.razorpayPaymentStatus = "success";
      order.paymentId = razorpayPaymentId;
      order.paymentDate = new Date();
      await order.save();

      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cart.items = [];
        cart.totalPrice = 0;
        cart.finalAmount = 0;
        await cart.save();
      }

      for (const product of order.products) {
        const productDetail = await Product.findById(product.productId);

        if (productDetail) {
          const newStock = productDetail.leftStock - product.quantity;

          if (newStock < 0) {
            return res.status(400).json({
              message: `Not enough stock for ${productDetail.product_name}`,
            });
          }

          productDetail.leftStock = newStock;
          await productDetail.save();
        }
      }

      return res.status(200).json({
        message: "Payment successful!",
        orderId: order._id,
      });
    } else {
      order.paymentStatus = "Failed";
      order.razorpayPaymentStatus = "failure";
      await order.save();

      return res.status(400).json({ message: "Payment verification failed" });
    }
  } catch (error) {
    console.error("Error confirming payment:", error.message);
    res
      .status(500)
      .json({ message: "Server error during payment confirmation" });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { paymentMethod, products, addressId, totalAmount } = req.body;
    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) {
      return res.status(400).json({ message: "Address not found" });
    }

    if (!products || !products.length) {
      return res.status(400).json({ message: "Products cannot be empty" });
    }

    const productIds = products.map((product) => product.productId);
    const productDetails = await Product.find({ _id: { $in: productIds } });

    if (!productDetails.length) {
      return res.status(400).json({ message: "Some products not found" });
    }

    if (totalAmount > 1000) {
      return res
        .status(400)
        .json({ message: "Order total exceeds 1000. Cannot place the order." });
    }

    const orderId = `ORD-${Date.now()}`;

    if (paymentMethod === "cod") {
      const newOrder = new Order({
        orderId: orderId,
        userId: userId,
        products: products.map((product) => {
          const productDetail = productDetails.find(
            (p) => p._id.toString() === product.productId.toString()
          );
          return {
            productId: product.productId,
            quantity: product.quantity,
            price: productDetail.discount_price || 0,
            name: productDetail.product_name || "Unnamed Product",
          };
        }),
        deliveryAddress: {
          fullName: selectedAddress.fullName,
          mobile: selectedAddress.mobile,
          pincode: selectedAddress.pincode,
          state: selectedAddress.state,
          address: selectedAddress.address,
          city: selectedAddress.city,
        },
        paymentMethod: paymentMethod,
        totalAmount: totalAmount,
        paymentStatus: "Pending",
        orderStatus: "Pending",
      });

      const savedOrder = await newOrder.save();

      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cart.items = [];
        cart.totalPrice = 0;
        cart.finalAmount = 0;
        await cart.save();
      }

      for (const product of products) {
        const productDetail = productDetails.find(
          (p) => p._id.toString() === product.productId.toString()
        );

        if (productDetail) {
          const newStock = productDetail.leftStock - product.quantity;

          if (newStock < 0) {
            return res.status(400).json({
              message: `Not enough stock for ${productDetail.product_name}`,
            });
          }

          await Product.findByIdAndUpdate(product.productId, {
            leftStock: newStock,
          });
        }
      }

      return res.status(200).json({
        message: "Order placed successfully",
        orderId: savedOrder._id,
        paymentMethod: "Cash on Delivery",
        paymentStatus: "Pending",
      });
    } else {
      return res
        .status(400)
        .json({ message: "Invalid payment method selected" });
    }
  } catch (error) {
    console.error("Error placing order:", error.message);
    res.status(500).json({ message: "Error placing order. Please try again." });
  }
};


const viewOrderConfirmation = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId).populate("products.productId");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const priceSummary = {
      subtotal: order.products.reduce((acc, product) => {
        const price =
          product.productId.discount_price || product.productId.price;
        return acc + price * product.quantity;
      }, 0),
      deliveryCharges: "Free",
      totalAmount: order.totalAmount,
    };

    const deliveryDetails = {
      expectedDate: "3-5 business days",
      deliveryType: "Standard Delivery",
      additionalDetails: "No additional details",
    };

    let paymentDetails = {
      method:
        order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment",
      status: order.paymentStatus || "Pending",
    };

    if (order.paymentMethod === "razorpay") {
      paymentDetails = {
        method: "Razorpay",
        status: order.paymentStatus || "Pending",
        razorpayOrderId: order.razorpayOrderId || null,
        razorpayPaymentId: order.razorpayPaymentId || null,
      };
    }

    res.render("my account/order-confirmation", {
      orderId: order._id,
      deliveryAddress: order.deliveryAddress,
      deliveryDetails: deliveryDetails,
      products: order.products,
      priceSummary: priceSummary,
      paymentMethod: paymentDetails,
      layout: false,
    });
  } catch (error) {
    console.error("Error viewing order confirmation:", error);
    res.status(500).send("Server error");
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const orders = await Order.find({ userId })
      .populate({
        path: "products.productId",
        populate: {
          path: "category",
          select: "name",
        },
      })
      .sort({ createdAt: -1 });

    const transformedOrders = orders.map((order) => ({
      id: order._id,
      date: order.createdAt ? order.createdAt.toLocaleDateString() : "N/A",
      products: order.products.map((product) => ({
        name: product.productId?.product_name || "Unknown Product",
        productImage:
          product.productId?.product_images?.[0] || "placeholder.jpg",
        category: product.productId.category?.name || "N/A",
        quantity: product.quantity || 0,
        price: product.price || 0,
      })),
      totalPrice: order.totalAmount || 0,
      status: order.status || "Unknown",
      statusClass: order.status ? order.status.toLowerCase() : "unknown",
      razorpayPaymentStatus:order.razorpayPaymentStatus || "Unknown",
      razorpayOrderId:order.razorpayOrderId || "Unknown",
      paymentMethod:order.paymentMethod || "Unknown",
      shippingAddress: order.deliveryAddress
        ? `${order.deliveryAddress.address}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state}, ${order.deliveryAddress.pincode}`
        : "Address not available",
      trackOrderLink: `/orders/track/${order._id}`,
      invoiceLink: `/orders/invoice/${order._id}`,
      detailsLink: `/my-orders/order-details/${order.orderId}`,
    }));

    res.render("my account/view-orders", {
      orders: transformedOrders,
      message: req.query.message,
      layout: false,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Something went wrong while fetching your orders.");
  }
};

const viewOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).send("Order ID is required");
    }

    const order = await Order.findOne({ orderId })
      .populate("userId", "name email")
      .populate({
        path: "products.productId",
        populate: {
          path: "category",
          select: "name",
        },
      });

    if (!order) {
      return res.status(404).send("Order not found");
    }
    const canCancel = 
    (order.paymentMethod === "razorpay" && order.razorpayPaymentStatus === "success" || order.razorpayPaymentStatus === "pending" && (order.status === "Pending" || order.status === "Shipped")) ||
    (order.paymentMethod === "cod" && (order.status === "Pending" || order.status === "Shipped"));
  
    const canReturn = order.status === "Delivered";

    const orderData = {
      order: {
        orderId: order._id,
        date: order.createdAt ? order.createdAt.toLocaleDateString() : "N/A",
        items: order.products.map((product) => ({
          name: product.productId?.product_name || "Unknown Product",
          image: product.productId?.product_images?.[0] || "placeholder.jpg",
          category: product.productId.category?.name || "N/A",
          quantity: product.quantity || 0,
          totalPrice:
            (product.quantity || 0) * (product.productId.discount_price || 0),
        })),
        totalPrice: order.totalAmount || 0,
        status: order.status || "Unknown",
        statusClass: order.status ? order.status.toLowerCase() : "unknown",
        paymentStatus: order.paymentStatus || "Unknown",
        razorpayPaymentStatus: order.razorpayPaymentStatus || "Unknown",
        paymentMethod: order.paymentMethod || "Unknown",
        paymentStatusClass: order.paymentStatus
          ? order.paymentStatus.toLowerCase()
          : "unknown",
        totalItems: order.products.reduce(
          (acc, product) => acc + (product.quantity || 0),
          0
        ),
        shippingCost: "Free",
        total: order.totalAmount || 0,
        shipping: order.deliveryAddress
          ? {
              fullName: order.deliveryAddress.fullName || "N/A",
              address: order.deliveryAddress.address || "N/A",
              city: order.deliveryAddress.city || "N/A",
              state: order.deliveryAddress.state || "N/A",
              pincode: order.deliveryAddress.pincode || "N/A",
              mobile: order.deliveryAddress.mobile || "N/A",
            }
          : {
              firstName: "N/A",
              address: "N/A",
              city: "N/A",
              state: "N/A",
              pincode: "N/A",
              mobile: "N/A",
            },
        canCancel: canCancel,
        canReturn: canReturn,
      },
    };

    res.render("my account/order-details", { orderData, layout: false });
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).send("Server Error");
  }
};

const cancelOrder = async (req, res) => {
  const { orderId, reason, comment } = req.body;

  try {
    const order = await Order.findById(orderId).populate("products.productId");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "This order is already cancelled" });
    }

    for (let product of order.products) {
      const productInDb = product.productId;
      if (productInDb) {
        productInDb.leftStock += product.quantity;
        await productInDb.save();
      }
    }

    order.status = "Cancelled";
    order.cancellationReason = reason; 
    order.cancellationComment = comment; 

    if (order.paymentMethod === "razorpay") {
      if (order.paymentStatus === "Paid") {
        let wallet = await Wallet.findOne({ userId: order.userId });

        if (!wallet) {
          wallet = new Wallet({ userId: order.userId, balance: 0 });
          await wallet.save();
        }

        wallet.balance += order.totalAmount;
        wallet.transactions.push({
          id: `txn_${Date.now()}`,
          type: "Refund",
          amount: order.totalAmount,
          date: new Date(),
        });

        await wallet.save();

        order.paymentStatus = "Refunded";
      } else {
        order.paymentStatus = "Unpaid";
      }
    } else if (order.paymentMethod === "cod") {
      order.paymentStatus = "Unpaid";
    }

    await order.save();

    res.status(200).json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const returnOrder = async (req, res) => {
  const { orderId, reason, comment } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "Delivered") {
      if (order.returnRequested) {
        return res.status(400).json({ success: false, message: "Return request already submitted for this order" });
      }

      order.returnRequested = true;
      order.status = "Return Requested";
      order.returnReason = reason;
      order.returnComment = comment; 
      await order.save();

      res.status(200).json({ success: true, message: "Return request submitted successfully" });
    } else {
      res.status(400).json({ success: false, message: "This order cannot be returned as it is not delivered" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate("userId").lean();
    if (!order) {
      return res.status(404).send("Order not found");
    }

    const pdfDoc = new PDFDocument({ margin: 50 });

    const rupeeFontPath = path.join(__dirname, '..', 'public', 'fonts', 'NotoSans-Regular.ttf');
    pdfDoc.registerFont('NotoSans', rupeeFontPath);

    const fileName = `invoice-${orderId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`
    );

    pdfDoc.pipe(res);

    pdfDoc.font('NotoSans').fontSize(20).text("INVOICE", { align: "center" });
    pdfDoc.moveDown();

    pdfDoc.font('NotoSans').fontSize(12).text(`Order ID: ${order._id}`);
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.font('NotoSans').text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    pdfDoc.moveDown();
    pdfDoc.font('NotoSans').text(`Customer Name: ${order.userId.name}`);
    pdfDoc.font('NotoSans').text(`Customer Email: ${order.userId.email}`);
    pdfDoc.moveDown();
    if (order.deliveryAddress) {
      const address = order.deliveryAddress;
      pdfDoc.font('NotoSans').text("Delivery Address:");
      pdfDoc.font('NotoSans').text(`  Full Name: ${address.fullName}`);
      pdfDoc.font('NotoSans').text(`  Mobile: ${address.mobile}`);
      pdfDoc.font('NotoSans').text(`  Pincode: ${address.pincode}`);
      pdfDoc.font('NotoSans').text(`  State: ${address.state}`);
      pdfDoc.font('NotoSans').text(`  Address: ${address.address}`);
      pdfDoc.font('NotoSans').text(`  City: ${address.city}`);
      pdfDoc.moveDown(); 
    } else {
      pdfDoc.font('NotoSans').text("Delivery Address: Not available");
    }
    
    pdfDoc.moveDown();

    pdfDoc.font('NotoSans').text("Products:", { underline: true });
    order.products.forEach((item, index) => {
      pdfDoc.font('NotoSans').text(
        `${index + 1}. ${item.name} (x${item.quantity}) - ₹${item.price}`
      );
    });

    pdfDoc.moveDown();
    pdfDoc.font('NotoSans').text(`Subtotal: ₹${order.totalAmount}`);
    pdfDoc.font('NotoSans').text(`Delivery Charges: ₹${order && order.deliveryCharges ? order.deliveryCharges : 'Free'}`);
    pdfDoc.font('NotoSans').text(`Total Amount: ₹${order.totalAmount}`, { bold: true });
    pdfDoc.moveDown();

    pdfDoc.font('NotoSans').text("Payment Method: " + order.paymentMethod.toUpperCase());
    pdfDoc.font('NotoSans').text("Payment Status: " + order.paymentStatus.toUpperCase());
    pdfDoc.font('NotoSans').text("Order Status: " + order.status.toUpperCase());
    pdfDoc.moveDown(); 
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.font('NotoSans').text("Thank you for your order!", { align: "center" });

    pdfDoc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).send("Internal Server Error");
  }
};


const retryPayment = async (req, res) => {
  const { orderId } = req.body;

  try {
    const existingOrder = await Order.findOne({ razorpayOrderId: orderId });

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const newOrder = await razorpay.orders.create({
      amount: existingOrder.totalAmount * 100, 
      currency: "INR",
      receipt: `retry_${orderId}`, 
    });

    existingOrder.razorpayOrderId = newOrder.id;
    existingOrder.razorpayPaymentStatus = "pending";
    await existingOrder.save();

    res.status(200).json({
      success: true,
      message: "Retry initiated successfully.",
      newOrder,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Failed to create Razorpay order for retry.",
    });
  }
};


module.exports = {
  placeOrder,
  viewOrderConfirmation,
  getUserOrders,
  viewOrderDetails,
  cancelOrder,
  returnOrder,
  initiateOrder,
  confirmPayment,
  downloadInvoice,
  retryPayment
};
