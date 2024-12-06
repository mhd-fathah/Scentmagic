const Coupon = require('../models/coupon')

// const getCouponsPage = async (req, res) => {
//     try {
//         // Fetch all coupons from the database
//         const coupons = await Coupon.find();

//         // If you want to show details of a specific coupon (for example, the first one)
//         const couponDetails = coupons[0]; // Change this logic based on your needs

//         // Render the view with the fetched coupons and selected coupon details
//         res.render('admin/coupon-management', { coupons, couponDetails , layout: false });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// };


const getCouponsPage = async (req, res) => {
    try {
        // Fetch all coupons
        const coupons = await Coupon.find();

        // If there's a selected coupon ID in the URL, fetch it
        let selectedCoupon = null;
        if (req.params.couponId) {
            selectedCoupon = await Coupon.findById(req.params.couponId);
        }

        res.render('admin/coupon-management', {
            coupons,
            selectedCoupon,
            layout: false
        });
    } catch (err) {
        console.error('Error fetching coupons:', err);
        res.status(500).send('Internal Server Error');
    }
};



const addCoupon = async (req, res) => {
    try {
        const {
            code,
            type,
            amount,
            minPurchase,
            startDate,
            endDate,
            usageLimit,
            usagePerCustomer,
            description,
            applicableTo,  // Comes from the form or API request
            categories,
            products,
        } = req.body;

        // Normalize the applicableTo value to match the enum values
        const validApplicableToValues = ['All Products', 'Specific Categories', 'Specific Products'];
        if (!validApplicableToValues.includes(applicableTo)) {
            return res.status(400).send('Invalid value for "applicableTo"');
        }

        // Check if the coupon code already exists
        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).send('Coupon code already exists.');
        }

        // Prepare the coupon data
        const couponData = {
            code,
            type,
            discount: amount,
            minPurchase: minPurchase || 0,
            validFrom: startDate,
            validUntil: endDate,
            usageLimit: usageLimit || 1000,
            usagePerCustomer: usagePerCustomer || 1,
            description,
            applicableTo,  // Directly assigning the value from form
            applicableCategories: applicableTo === 'Specific Categories' ? categories || [] : [],
            applicableProducts: applicableTo === 'Specific Products' ? products || [] : [],
        };

        // Create a new coupon instance
        const newCoupon = new Coupon(couponData);

        // Save the coupon to the database
        await newCoupon.save();

        // Redirect to the coupons list or admin page
        res.redirect('/admin/coupon');
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).send('Server Error');
    }
};


const getCouponDetails = async (req, res) => {
    try {
        const couponId = req.params.id; // Get coupon ID from URL
        console.log(couponId)
        const coupon = await Coupon.findById(couponId); // Fetch coupon from the DB
        
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        // Return the coupon data as a JSON response
        res.json(coupon);
    } catch (err) {
        console.error('Error fetching coupon:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {getCouponsPage , addCoupon , getCouponDetails}