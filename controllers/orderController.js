const Order = require("../models/order");
const User = require("../models/user");
const Product = require("../models/product");
const Cart = require("../models/cart");

const placeOrder = async (req, res) => {
  try {
    const { paymentMethod, products, addressId, totalAmount } = req.body;
    const userId = req.user?._id;

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

module.exports = { placeOrder, viewOrderConfirmation };
