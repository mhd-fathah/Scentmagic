const Referral = require('../models/refferral')
const User = require('../models/user')

const renderReferralPage = async (req, res) => {
    try {
        const userId = req.session.user?._id; 
        const user = await User.findById(userId);
        const referralData = await Referral.findOne({ user: userId }); 

        if (!referralData) {
            const referralCode = `SCENTMAGIC${Math.floor(Math.random() * 10000)}`;
            await Referral.create({ user: userId, referralCode });

            return res.render('my account/refferral', {
                referralCode,
                referralStatus: 'Active',
                totalReferrals: 0,
                totalEarned: '₹0',
                pendingRewards: 0
            });
        }

        res.render('my account/refferral', {
            referralCode: referralData.referralCode,
            referralStatus: referralData.status,
            totalReferrals: referralData.totalReferrals,
            totalEarned: `₹${referralData.totalEarned}`,
            pendingRewards: referralData.pendingRewards
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {renderReferralPage}