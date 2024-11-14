const express = require("express");
const app = express();
const ejs = require("ejs");
const ejsLayouts = require("express-ejs-layouts");
const path = require("path");
const userRoutes = require("./routes/userRoutes");
const connectDB = require("./config/db");
const session = require("express-session");
const nocache = require('nocache')
const cookieParser = require("cookie-parser")

app.use(ejsLayouts);
app.use(cookieParser())
app.use(nocache())

app.use(
  session({
    secret: "my-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layouts/main");
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", userRoutes);

connectDB();

app.listen(3000, () => {
  console.log("Server Started : http://localhost:3000/signup");
});
