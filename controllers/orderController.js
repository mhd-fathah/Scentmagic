const Order = require("../models/order");
const User = require("../models/user");
const Product = require("../models/product");
const Cart = require("../models/cart");

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

    const orderId = `ORD-${Date.now()}`;

    let initialPaymentStatus = ["cod", "razorpay", "upi", "card"].includes(
      paymentMethod
    )
      ? "Pending"
      : "Paid";

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
      paymentStatus: initialPaymentStatus,
      orderStatus: "Pending",
    });

    const savedOrder = await newOrder.save();

    const priceSummary = {
      subtotal: products.reduce((acc, product) => {
        const productDetail = productDetails.find(
          (p) => p._id.toString() === product.productId.toString()
        );
        return acc + (productDetail.discount_price || 0) * product.quantity;
      }, 0),
      deliveryCharges: 0,
      totalAmount: totalAmount,
    };

    const deliveryDetails = {
      expectedDate: "3-5 business days",
      deliveryType: "Standard Delivery",
      additionalDetails: "No additional details",
    };

    const cart = await Cart.findOne({ user: userId });

    if (cart) {
      cart.items = [];
      cart.totalPrice = 0;
      cart.finalAmount = 0;
      await cart.save();
      console.log("Cart cleared for user:", userId);
    } else {
      console.log("Cart not found for user:", userId);
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

    res.status(200).json({
      message: "Order placed successfully",
      orderId: savedOrder._id,
      priceSummary,
      deliveryDetails,
      paymentDetails: {
        method: paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment",
        status: initialPaymentStatus,
      },
    });
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

    const paymentDetails = {
      method:
        order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment",
      cardEnding: order.paymentMethod === "online" ? "1234" : null,
      status: order.paymentStatus || "Pending",
    };

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

    const canCancel = (order.status === "Pending" || order.status === "Shipped");
    const canReturn = (order.status === "Delivered");

    console.log(`Order Status: ${order.status}`);
    console.log(`Can Cancel: ${canCancel}`);
    console.log(`Can Return: ${canReturn}`);

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
        paymentStatusClass: order.paymentStatus
          ? order.paymentStatus.toLowerCase()
          : "unknown", 
        totalItems: order.products.reduce(
          (acc, product) => acc + (product.quantity || 0),
          0
        ), 
        shippingCost: 'Free', 
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
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId).populate('products.productId'); 

    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (order.status === 'Canceled') {
      return res.status(400).send('This order is already canceled');
    }

    for (let product of order.products) {
      const productInDb = product.productId;
      if (productInDb) {
        productInDb.leftStock += product.quantity; 
        await productInDb.save(); 
      }
    }

    order.status = 'Cancelled';
    
    order.paymentStatus = 'Unpaid';
    
    await order.save(); 

    res.redirect('/my-orders?message=Order%20Canceled%20Successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};



const returnOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (order.status === 'Delivered') {
      order.status = 'Returned'; 
      order.paymentStatus = 'Refunded';
      await order.save();

      res.redirect('/my-orders?message=Order%20Returned%20Successfully');
    } else {
      res.status(400).send('This order cannot be returned');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

module.exports = {
  placeOrder,
  viewOrderConfirmation,
  getUserOrders,
  viewOrderDetails,
  cancelOrder,
  returnOrder
};
