const Cart = require("../models/cart");
const Product = require("../models/product");
const Coupon = require("../models/coupon");

const getCart = async (req, res) => {
  if (!req.session.user || !req.session.user._id) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const userId = req.session.user._id;

  try {
    let cart = await Cart.findOne({ user: userId }).populate("items.productId");

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalPrice: 0,
      });
      await cart.save();
      console.log("New cart created for user:", userId);
    }

    let totalPrice = 0;
    let totalDiscount = 0;
    let deliveryCharges = 0;
    let finalAmount = 0;

    cart.items = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.productId._id);
        if (!product || product.isDeleted) {
          console.log(
            `Product with ID ${item.productId._id} has been deleted and will be removed from the cart.`
          );
          return null;
        }
        return item;
      })
    );

    cart.items = cart.items.filter((item) => item !== null);

    if (cart.items.length > 0) {
      cart.items.forEach((item) => {
        const product = item.productId;
        const discount = product.regular_price - product.discount_price;

        totalPrice += product.regular_price * item.quantity;
        totalDiscount += discount * item.quantity;
      });

      finalAmount = totalPrice - totalDiscount + deliveryCharges;
    }

    const priceDetails = {
      totalPrice: totalPrice.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      deliveryCharges: deliveryCharges.toFixed(2),
      finalAmount: finalAmount.toFixed(2),
    };

    await cart.save();

    // Pass userId, cartItems, and priceDetails to the EJS view
    res.render("my account/cart", {
      layout: false,
      userId: userId, // Add userId here
      cartItems: cart.items,
      priceDetails,
      isEmpty: cart.items.length === 0,
    });
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    if (product.leftStock === 0) {
      return res.status(400).send("Sorry, this product is out of stock");
    }

    if (quantity > product.leftStock) {
      return res
        .status(400)
        .send(`Sorry, we only have ${product.leftStock} units available`);
    }

    if (quantity > 10) {
      return res
        .status(400)
        .send("You can only add up to 10 items of this product.");
    }

    const today = new Date();

    today.setDate(today.getDate() + 7);

    const day = today.getDate();
    const year = today.getFullYear();

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthName = months[today.getMonth()];

    const formattedDeliveryDate = `${day} ${monthName} ${year}`;

    const cartItem = {
      productId: product._id,
      quantity: quantity || 1,
      deliveryDate: formattedDeliveryDate,
    };

    let cart = await Cart.findOne({ user: req.session.user._id });

    if (!cart) {
      cart = new Cart({
        user: req.session.user._id,
        items: [cartItem],
        totalPrice: product.discount_price * cartItem.quantity,
      });
    } else {
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === product._id.toString()
      );

      if (existingItemIndex !== -1) {
        const existingItem = cart.items[existingItemIndex];
        const newQuantity = existingItem.quantity + cartItem.quantity;

        if (newQuantity > product.leftStock) {
          return res
            .status(400)
            .send(`Sorry, we only have ${product.leftStock} units available`);
        }

        if (newQuantity > 10) {
          return res
            .status(400)
            .send("You can only add up to 10 items of this product.");
        }

        existingItem.quantity = newQuantity;
        existingItem.price = product.discount_price;
        existingItem.deliveryDate = cartItem.deliveryDate;
      } else {
        cart.items.push(cartItem);
      }

      cart.totalPrice = cart.items.reduce((total, item) => {
        return total + product.discount_price * item.quantity;
      }, 0);
    }

    if (isNaN(cart.totalPrice)) {
      cart.totalPrice = 0;
    }

    await cart.save();

    return res.status(200).json(cart);
  } catch (err) {
    console.error("Error in addToCart:", err);
    return res.status(500).send("Internal server error");
  }
};

const removeFromCart = async (req, res) => {
  const { productId } = req.body;
  const userId = req.session.user._id;

  try {
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId._id.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    cart.items.splice(itemIndex, 1);

    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.productId.discount_price * item.quantity,
      0
    );

    await cart.save();

    return res.status(200).json({ message: "Item removed successfully" });
  } catch (err) {
    console.error("Error removing item:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//   const saveForLater = async (req, res) => {
//     const { productId } = req.body;
//     const userId = req.user._id;

//     try {
//         // Find the user's cart
//         const cart = await Cart.findOne({ user: userId });

//         if (!cart) {
//             return res.status(404).json({ message: "Cart not found" });
//         }

//         // Move the item to the "saved for later" section (or another array)
//         const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
//         if (itemIndex !== -1) {
//             // Optionally, you can create a separate savedItems array in the Cart schema
//             const item = cart.items[itemIndex];
//             cart.savedItems.push(item); // Move item to saved items array
//             cart.items.splice(itemIndex, 1); // Remove from current items list
//             await cart.save();
//             return res.status(200).json({ message: "Item saved for later" });
//         } else {
//             return res.status(404).json({ message: "Product not found in cart" });
//         }
//     } catch (err) {
//         console.error('Error saving item for later:', err);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

const updateCartQuantity = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user._id;

  try {
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.find(
      (item) => item.productId._id.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { leftStock } = product;

    if (quantity > leftStock) {
      return res.status(400).json({
        message: `Only ${leftStock} units available. Please reduce the quantity.`,
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be at least 1." });
    }

    if (quantity > 10) {
      return res.status(400).json({
        message: "You can only add up to 10 items of this product.",
      });
    }

    item.quantity = quantity;

    let totalPrice = 0;
    let totalDiscount = 0;

    cart.items.forEach((item) => {
      const regularPrice = item.productId.regular_price;
      const discountPrice = item.productId.discount_price;
      totalPrice += regularPrice * item.quantity;
      totalDiscount += (regularPrice - discountPrice) * item.quantity;
    });

    const deliveryCharges = 0;
    const finalAmount = totalPrice - totalDiscount + deliveryCharges;

    cart.totalPrice = totalPrice;
    cart.totalDiscount = totalDiscount;
    cart.deliveryCharges = deliveryCharges;
    cart.finalAmount = finalAmount;

    await cart.save();

    product.leftStock -= quantity - item.quantity;
    await product.save();

    return res.status(200).json({
      message: "Quantity updated successfully",
      cartDetails: {
        totalPrice,
        totalDiscount,
        deliveryCharges,
        finalAmount,
      },
    });
  } catch (err) {
    console.error("Error updating quantity:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCartDetails = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const userId = req.session.user._id;

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.productId.discount_price * item.quantity,
      0
    );

    res.json({
      totalItems,
      totalPrice: totalPrice.toFixed(2),
    });
  } catch (err) {
    console.error("Error fetching cart details:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const applyCoupon = async (req, res) => {
  const { userId } = req.params; // Get userId from URL parameters
  const { couponCode } = req.body; // Get couponCode from request body

  try {
    // Find the coupon by the coupon code
    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon code" });
    }

    // Validate coupon (check if it's expired, usage limit, etc.)
    const currentDate = new Date();
    if (currentDate > coupon.validUntil) {
      return res.json({ success: false, message: "Coupon has expired" });
    }

    if (coupon.used >= coupon.usageLimit) {
      return res.json({
        success: false,
        message: "Coupon usage limit reached",
      });
    }

    // Check if the coupon applies to a specific category or product
    let applicableProducts = [];
    if (
      coupon.applicableTo === "Specific Categories" &&
      coupon.applicableCategories.length > 0
    ) {
      applicableProducts = await Product.find({
        category: { $in: coupon.applicableCategories },
      });
    } else if (
      coupon.applicableTo === "Specific Products" &&
      coupon.applicableProducts.length > 0
    ) {
      applicableProducts = await Product.find({
        _id: { $in: coupon.applicableProducts },
      });
    } else {
      // If coupon is applicable to all products
      applicableProducts = await Product.find({});
    }

    if (applicableProducts.length === 0) {
      return res.json({
        success: false,
        message: "No applicable products found for this coupon",
      });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    let totalDiscount = 0;
    let totalPrice = 0;
    let deliveryCharges = cart.deliveryCharges;

    // Loop through products in the cart and apply the coupon
    for (let item of cart.items) {
      const product = await Product.findById(item.productId);

      // Check if the product is eligible for the coupon
      if (
        applicableProducts.some(
          (p) => p._id.toString() === product._id.toString()
        )
      ) {
        // Apply discount to the product price
        if (coupon.type === "percentage") {
          // Apply percentage discount to the price
          const discountAmount =
            (product.discount_price * coupon.discount) / 100;
          item.discountedPrice = product.discount_price - discountAmount;
          totalDiscount += discountAmount;
        } else if (coupon.type === "fixed") {
          // Apply fixed discount to the price
          item.discountedPrice = product.discount_price - coupon.discount;
          totalDiscount += coupon.discount;
        } else if (coupon.type === "free_shipping") {
          // Apply free shipping (for simplicity, assume we set a shipping fee to 0)
          item.shippingFee = 0;
        }

        // Recalculate the total price of the cart item after applying the discount
        totalPrice += item.discountedPrice * item.quantity;
      } else {
        // If product is not applicable for the coupon, add original price to total
        totalPrice += product.discount_price * item.quantity;
      }
    }

    // Adjust delivery charges if applicable
    if (coupon.freeShipping && totalPrice >= coupon.freeShippingThreshold) {
      deliveryCharges = 0; // Free delivery if coupon offers free shipping on a minimum order amount
    }

    // Update coupon usage count
    coupon.used += 1;
    await coupon.save();

    // Calculate the final amount after applying the discount and delivery charges
    const finalAmount = totalPrice + deliveryCharges;

    // Update the cart with new prices and total amount
    cart.totalPrice = totalPrice;
    cart.totalDiscount = totalDiscount;
    cart.deliveryCharges = deliveryCharges;
    cart.finalAmount = finalAmount;

    await cart.save();

    // Send updated cart details in the response
    // Inside the applyCoupon function, after the cart update
    return res.json({
      success: true,
      message: "Coupon applied successfully!",
      cartDetails: {
          totalPrice: cart.totalPrice || 0,
          totalDiscount: cart.totalDiscount || 0,
          deliveryCharges: cart.deliveryCharges || 0,
          finalAmount: cart.finalAmount || 0,
      }
  });
  
  } catch (error) {
    console.error("Error applying coupon:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  getCartDetails,
  applyCoupon,
};
