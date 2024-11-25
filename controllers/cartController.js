const Cart = require("../models/cart");
const Product = require("../models/product");

const getCart = async (req, res) => {
  // Ensure the user is authenticated
  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const userId = req.user._id;

  try {
    // Fetch the user's cart from the database and populate product details
    let cart = await Cart.findOne({ user: userId }).populate("items.productId");

    // If the cart doesn't exist, create a new cart
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalPrice: 0,
      });
      await cart.save();
      console.log("New cart created for user:", userId);
    }

    // Initialize price calculation variables
    let totalPrice = 0;
    let totalDiscount = 0;
    let deliveryCharges = 0; // Set this to a dynamic value if required
    let finalAmount = 0;

    // Calculate total prices and discounts if the cart has items
    if (cart.items.length > 0) {
      cart.items.forEach((item) => {
        const product = item.productId;
        const discount = product.regular_price - product.discount_price;

        totalPrice += product.regular_price * item.quantity;
        totalDiscount += discount * item.quantity;
      });

      // Final amount calculation
      finalAmount = totalPrice - totalDiscount + deliveryCharges;
    }

    // Prepare price details to pass to the view
    const priceDetails = {
      totalPrice: totalPrice.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      deliveryCharges: deliveryCharges.toFixed(2),
      finalAmount: finalAmount.toFixed(2),
    };

    // Render the cart page with dynamic data
    res.render("my account/cart", {
      layout: false,
      cartItems: cart.items,
      priceDetails,
      isEmpty: cart.items.length === 0, // Show message if cart is empty
    });
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body; // Assuming you send productId and quantity in the request

    // Find the product details
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Check if the product is in stock
    if (product.leftStock === 0) {
      return res.status(400).send("Sorry, this product is out of stock");
    }

    // Check if the requested quantity is available
    if (quantity > product.leftStock) {
      return res
        .status(400)
        .send(`Sorry, we only have ${product.leftStock} units available`);
    }

    // Create a cart item with the product details
    const cartItem = {
      productId: product._id, // Reference to the product
      quantity: quantity || 1, // Default to 1 if no quantity is passed
      deliveryDate: "Dec 10, 2024", // Use a dynamic delivery date (can be set to any logic)
    };

    // Check if the cart already exists for this user
    let cart = await Cart.findOne({ user: req.user._id });

    // If cart doesn't exist, create a new one
    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: [cartItem],
        totalPrice: product.discount_price * cartItem.quantity, // Calculate total price for the new cart
      });
    } else {
      // If cart exists, check if the item already exists in the cart
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === product._id.toString()
      );

      if (existingItemIndex !== -1) {
        // If the item already exists, update the quantity and price
        const existingItem = cart.items[existingItemIndex];
        const newQuantity = existingItem.quantity + cartItem.quantity;

        // Check if the updated quantity exceeds stock
        if (newQuantity > product.leftStock) {
          return res
            .status(400)
            .send(`Sorry, we only have ${product.leftStock} units available`);
        }

        existingItem.quantity = newQuantity;
        existingItem.price = product.discount_price; // Use discount price
        existingItem.deliveryDate = cartItem.deliveryDate; // Update delivery date
      } else {
        // If the item is new, add it to the cart
        cart.items.push(cartItem);
      }

      // Recalculate total price by considering the prices of all cart items
      cart.totalPrice = cart.items.reduce((total, item) => {
        return total + product.discount_price * item.quantity;
      }, 0);
    }

    // Ensure that totalPrice is a valid number (check for NaN)
    if (isNaN(cart.totalPrice)) {
      cart.totalPrice = 0; // Or handle it according to your use case
    }

    // Save the cart
    await cart.save();

    // Return the updated cart data in the response
    return res.status(200).json(cart); // Respond with the updated cart
  } catch (err) {
    console.error("Error in addToCart:", err);
    return res.status(500).send("Internal server error");
  }
};

const removeFromCart = async (req, res) => {
  const { productId } = req.body;
  const userId = req.user._id;

  try {
    // Ensure `productId` is provided
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Find the index of the item to be removed
    const itemIndex = cart.items.findIndex(
      (item) => item.productId._id.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1);

    // Recalculate the total price
    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.productId.discount_price * item.quantity,
      0
    );

    // Save the updated cart
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
  const userId = req.user._id;

  try {
    // Find the user's cart
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    ); // Populate product details

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Find the cart item and update its quantity
    const item = cart.items.find(
      (item) => item.productId._id.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Validate quantity
    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // Update item quantity
    item.quantity = quantity;

    // Recalculate the total price
    let totalPrice = 0;
    let totalDiscount = 0;
    let deliveryCharges = 0;

    cart.items.forEach((item) => {
      totalPrice += item.productId.regular_price * item.quantity;
      totalDiscount +=
        (item.productId.regular_price - item.productId.discount_price) *
        item.quantity;
    });

    // Assuming free delivery for simplicity. Modify this logic as per your requirements.
    deliveryCharges = 0;

    const finalAmount = totalPrice - totalDiscount + deliveryCharges;

    // Update the cart
    cart.totalPrice = totalPrice;
    cart.totalDiscount = totalDiscount;
    cart.deliveryCharges = deliveryCharges;
    cart.finalAmount = finalAmount;

    await cart.save();

    // Return the updated cart details
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
    const userId = req.user._id; // Assuming you're using a session or JWT to track the user

    // Fetch the cart for the current user and populate the product details
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Calculate total items and total price
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.productId.discount_price * item.quantity,
      0
    );

    // Respond with the total items and total price, formatted as necessary
    res.json({
      totalItems,
      totalPrice: totalPrice.toFixed(2), // You can round or format the price as needed
    });
  } catch (err) {
    console.error("Error fetching cart details:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  getCartDetails,
};
