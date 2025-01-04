const Wishlist = require("../models/wishlist");
const Product = require("../models/product");
const Cart = require("../models/cart");
const HttpStatus = require("../constants/httpStatus")

const addToWishlist = async (req, res) => {
  try {
    const { productId, productName, productPrice } = req.body;
    const userId = req.session.user._id;

    const existingItem = await Wishlist.findOne({ userId, productId });
    if (existingItem) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: "Product already in wishlist" });
    }

    const newWishlistItem = new Wishlist({
      userId,
      productId,
      productName,
      productPrice,
    });
    await newWishlistItem.save();
    res.status(HttpStatus.CREATED).json({ message: "Product added to wishlist" });
  } catch (error) {
    console.error(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Error adding to wishlist" });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const wishlistItems = await Wishlist.find({ userId }).populate("productId");
    res.render("my account/wishlist", { wishlistItems, layout: false });
  } catch (error) {
    console.error(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Error fetching wishlist" });
  }
};

const getWishlistDetails = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const totalItems = await Wishlist.countDocuments({ userId });

    res.json({
      totalItems,
    });
  } catch (error) {
    console.error("Error fetching wishlist details:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Unable to fetch wishlist details" });
  }
};

const moveToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    console.log("Received productId:", productId);

    if (!req.session.user) {
      return res.status(HttpStatus.BAD_REQUEST).send("User not authenticated.");
    }

    const wishlistItem = await Wishlist.findOne({productId});
    console.log("Wishlist Item:", wishlistItem);

    if (!wishlistItem) {
      return res.status(HttpStatus.NOT_FOUND).send("Item not found in wishlist");
    }

    const product = await Product.findById(productId);
    console.log("Product:", product);

    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).send("Product not found");
    }

    if (product.leftStock === 0) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send("This product is out of stock and cannot be moved to the cart.");
    }

    const cartItem = {
      productId: product._id,
      quantity: 1,
      deliveryDate: "2024-12-10",
    };

    let cart = await Cart.findOne({ user: req.session.user._id });
    console.log("Found cart:", cart);

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
        existingItem.quantity += cartItem.quantity;
      } else {
        cart.items.push(cartItem);
      }

      cart.totalPrice = cart.items.reduce((total, item) => {
        return total + item.quantity * product.discount_price;
      }, 0);
    }

    if (isNaN(cart.totalPrice)) {
      cart.totalPrice = 0;
    }

    await cart.save();

    await Wishlist.findOneAndDelete({productId});

    return res.status(HttpStatus.OK).json(cart);
  } catch (err) {
    console.error("Error in moveToCart:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal server error");
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;

    await Wishlist.deleteOne({ userId, productId });

    res.json({ success: true, message: "Item removed from wishlist" });
  } catch (error) {
    console.error("Error removing item from wishlist:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, error: "Unable to remove item from wishlist" });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  moveToCart,
  getWishlistDetails,
  removeFromWishlist,
};
