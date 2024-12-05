const Wallet = require("../models/wallet");
const User = require('../models/user')

const getWalletBalance = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found." });
    }

    res.status(200).json({ balance: wallet.balance, transactions: wallet.transactions });
  } catch (error) {
    console.error("Error fetching wallet balance:", error.message);
    res.status(500).json({ message: "Error fetching wallet balance." });
  }
};

const getWalletPage = async (req, res) => {
    try {
      const userId = req.session.user._id;
  
      // Find the user by their ID to get wallet balance and other details
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).send('User not found');
      }
  
      // Pass wallet as an object containing balance to match EJS structure
      res.render('my account/wallet', {
        layout: false,
        wallet: { balance: user.walletBalance || 0 }, // Pass wallet object with balance
        transactions: user.transactions || [], // Pass transaction history if needed
        user: user,  // You can pass other user details to display
      });
    } catch (error) {
      console.error("Error rendering wallet page:", error);
      res.status(500).send("Server Error");
    }
  };
  


module.exports = {getWalletBalance , getWalletPage}