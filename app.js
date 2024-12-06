const express = require("express");
const app = express();
const ejs = require("ejs");
const ejsLayouts = require("express-ejs-layouts");
const path = require("path");
const adminRoutes = require('./routes/adminRoutes')
const userRoutes = require("./routes/userRoutes");
const connectDB = require("./config/db");
require('dotenv').config();
const session = require("express-session");
const nocache = require('nocache')
const cookieParser = require("cookie-parser")
const passport = require("passport");
require("./config/passport");
const categoryRoutes = require('./routes/categoryRoutes')
const auth = require("./middleware/authMiddleware")
const productRoutes = require('./routes/productRoutes')
const cartRoutes = require('./routes/cartRoutes')
const orderRoutes = require('./routes/orderRoutes')
const wishlistRoutes = require('./routes/wishlistRoutes')
const walletRoutes = require('./routes/walletRoutes')
const couponRoutes = require('./routes/couponRoutes')

app.use(ejsLayouts);
app.use(cookieParser())
app.use(nocache())

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layouts/main");
app.use(express.static(path.join(__dirname, "public")));
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 

app.use(auth.setCurrentRoute)
app.use('/wallet',walletRoutes)
app.use('/wishlist',wishlistRoutes)
app.use(orderRoutes)
app.use(cartRoutes)
app.use("/admin",adminRoutes,categoryRoutes,productRoutes,couponRoutes)
app.use("/", userRoutes);

app.use(auth.checkBlocked)

connectDB();

app.listen(3000, () => {
  console.log("Server Started : http://localhost:3000/");
});