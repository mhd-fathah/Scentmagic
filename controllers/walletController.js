const Wallet = require("../models/wallet");
const User = require('../models/user')

// const getWalletBalance = async (req, res) => {
//   try {
//     const userId = req.session.user?._id;

//     if (!userId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }

//     const wallet = await Wallet.findOne({ userId });
//     if (!wallet) {
//       return res.status(404).json({ message: "Wallet not found." });
//     }

//     res.status(200).json({ balance: wallet.balance, transactions: wallet.transactions });
//   } catch (error) {
//     console.error("Error fetching wallet balance:", error.message);
//     res.status(500).json({ message: "Error fetching wallet balance." });
//   }
// };

const getWalletPage = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).send("Wallet not found");
    }

    const sortedTransactions = (wallet.transactions || []).sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    res.render("my account/wallet", {
      layout: false,
      wallet: wallet,
      transactions: sortedTransactions, 
      user: req.session.user,
    });
  } catch (error) {
    console.error("Error rendering wallet page:", error);
    res.status(500).send("Server Error");
  }
};

  


module.exports = {  getWalletPage}