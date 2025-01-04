const Coupon = require("../models/coupon");
const HttpStatus = require("../constants/httpStatus")

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
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 10; 
    const skip = (page - 1) * limit;

    const totalItems = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalItems / limit);
    const coupons = await Coupon.find().skip(skip).limit(limit);

    let selectedCoupon = null;
    if (req.params.couponId) {
      selectedCoupon = await Coupon.findById(req.params.couponId);
    }

    res.render("admin/coupon-management", {
      coupons,
      alert: null,
      selectedCoupon,
      currentPage: page,
      totalPages,
      totalItems,
      layout: false,
    });
  } catch (err) {
    console.error("Error fetching coupons:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};


const addCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      status,
      amount,
      minPurchase,
      startDate,
      endDate,
      usageLimit,
      usagePerCustomer,
      description,
      applicableTo,
      categories,
      products,
    } = req.body;

    const validApplicableToValues = [
      "All Products",
      "Specific Categories",
      "Specific Products",
    ];
    if (!validApplicableToValues.includes(applicableTo)) {
      return res.status(HttpStatus.BAD_REQUEST).send('Invalid value for "applicableTo"');
    }

    const validStatuses = ["active", "expired", "scheduled"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(HttpStatus.BAD_REQUEST).send('Invalid value for "status"');
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(HttpStatus.BAD_REQUEST).send("Coupon code already exists.");
    }

    const couponData = {
      code,
      type,
      status: status.toLowerCase(),
      discount: amount,
      minPurchase: minPurchase || 0,
      validFrom: startDate,
      validUntil: endDate,
      usageLimit: usageLimit || 1000,
      usagePerCustomer: usagePerCustomer || 1,
      description,
      applicableTo,
      applicableCategories:
        applicableTo === "Specific Categories" ? categories || [] : [],
      applicableProducts:
        applicableTo === "Specific Products" ? products || [] : [],
    };

    const newCoupon = new Coupon(couponData);
    await newCoupon.save();

    res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error adding coupon:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const editCoupon = async (req, res) => {
  try {
    const {
      couponId,
      type,
      code,
      status,
      amount,
      minPurchase,
      startDate,
      endDate,
      usageLimit,
      usagePerCustomer,
      description,
      applicableTo,
      categories,
      products,
    } = req.body;

    const validApplicableToValues = [
      "All Products",
      "Specific Categories",
      "Specific Products",
    ];
    if (!validApplicableToValues.includes(applicableTo)) {
      return res.status(HttpStatus.BAD_REQUEST).send('Invalid value for "applicableTo"');
    }

    const validStatuses = ["active", "expired", "scheduled"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(HttpStatus.BAD_REQUEST).send('Invalid value for "status"');
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(HttpStatus.NOT_FOUND).send("Coupon not found.");
    }

    if (coupon.code !== code) {
      const existingCoupon = await Coupon.findOne({ code });
      if (existingCoupon) {
        return res.status(HttpStatus.BAD_REQUEST).send("Coupon code already exists.");
      }
    }

    const updatedCouponData = {
      code,
      type,
      status: status.toLowerCase(),
      discount: amount,
      minPurchase: minPurchase || 0,
      validFrom: startDate,
      validUntil: endDate,
      usageLimit: usageLimit || 1000,
      usagePerCustomer: usagePerCustomer || 1,
      description,
      applicableTo,
      applicableCategories:
        applicableTo === "Specific Categories" ? categories || [] : [],
      applicableProducts:
        applicableTo === "Specific Products" ? products || [] : [],
    };

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      updatedCouponData,
      { new: true }
    );

    res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error editing coupon:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const getCouponDetails = async (req, res) => {
  try {
    const couponId = req.params.id;
    console.log(couponId);
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: "Coupon not found" });
    }

    res.json(coupon);
  } catch (err) {
    console.error("Error fetching coupon:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
  }
};

// const deactivateCoupon = async (req, res) => {
//   try {
//     const { couponId } = req.body;

//     // Validate if couponId is provided
//     if (!couponId) {
//       return res.status(400).json({ message: "Coupon ID is required" });
//     }

//     // Find and update the coupon's status
//     const updatedCoupon = await Coupon.findByIdAndUpdate(
//       couponId,
//       { status: "expired" },
//       { new: true }
//     );

//     if (!updatedCoupon) {
//       return res.status(404).json({ message: "Coupon not found" });
//     }

//     res.status(200).json({ message: "Coupon deactivated successfully" });
//   } catch (error) {
//     console.error("Error deactivating coupon:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

const deactivateCoupon = async (req, res) => {
  try {
    const { couponId } = req.body;

    const coupons = await Coupon.find();

    let selectedCoupon = null;
    if (req.params.couponId) {
      selectedCoupon = await Coupon.findById(req.params.couponId);
    }

    if (!couponId) {
      return res.render("admin/coupon-management", {
        coupons,
        selectedCoupon,
        layout: false,
        alert: {
          type: "error",
          title: "Error",
          message: "Coupon ID is required",
          redirect: false,
        },
      });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      { status: "expired" },
      { new: true }
    );

    if (!updatedCoupon) {
      return res.render("admin/coupon-management", {
        coupons,
        selectedCoupon,
        layout: false,
        alert: {
          type: "error",
          title: "Error",
          message: "Coupon not found",
          redirect: false,
        },
      });
    }

    res.render("admin/coupon-management", {
      coupons,
      selectedCoupon,
      layout: false,
      alert: {
        type: "success",
        title: "Success",
        message: "Coupon deactivated successfully",
        redirect: "/admin/coupon",
      },
    });
  } catch (error) {
    console.error("Error deactivating coupon:", error);
    res.render("admin/coupon-management", {
      coupons,
      selectedCoupon,
      layout: false,
      alert: {
        type: "error",
        title: "Error",
        message: "Server error. Please try again.",
        redirect: false,
      },
    });
  }
};

module.exports = {
  getCouponsPage,
  addCoupon,
  getCouponDetails,
  editCoupon,
  deactivateCoupon,
};
