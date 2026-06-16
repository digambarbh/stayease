if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express")
const app = express()
app.set('trust proxy', 1);
const path = require('path')
const connectDb = require('./db/db')
const ejsmate = require("ejs-mate")
const userRoute = require("./routes/user")
const stayRoute = require("./routes/stay")
const jwt = require("jsonwebtoken")
const methodOverride = require("method-override")
const cookieParser = require('cookie-parser')
const User = require("./model/user")
const Blacklist = require("./model/blacklist")
const bookingRoute = require("./routes/booking")
const stay = require("./model/stay")
const helmet = require("helmet")
const mongoSanitize = require("express-mongo-sanitize");
connectDb()
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.maptiler.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://kit.fontawesome.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://kit.fontawesome.com", "https://fonts.googleapis.com"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["blob:"],
            objectSrc: [],
            imgSrc: ["'self'", "blob:", "data:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://kit.fontawesome.com", "https://cdnjs.cloudflare.com", "https://ka-f.fontawesome.com"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: '_' });
    if (req.query) mongoSanitize.sanitize(req.query, { replaceWith: '_' });
    if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
    next();
});
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.engine('ejs', ejsmate)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(cookieParser())
app.use(methodOverride("_method"))
app.use(async (req, res, next) => {
    try {
        res.locals.Role = "user"
        const token = req.cookies.token
        if (!token) {
            res.locals.currentUser = null
            res.locals.isLoggedIn = false
            return next()
        }
        // Error: navbar/user state was ignoring blacklisted logged-out tokens.
        const isBlacklisted = await Blacklist.findOne({ token })
        if (isBlacklisted) {
            res.locals.currentUser = null
            res.locals.isLoggedIn = false
            return next()
        }
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        const user = await User.findById(payload.id).select('-password')
        res.locals.currentUser = user
        res.locals.isLoggedIn = true
        res.locals.Role = user.role
        next();
    } catch (e) {
        res.locals.currentUser = null
        res.locals.isLoggedIn = false
        res.locals.Role = "user"
        next()
    }
})

app.use((req, res, next) => {
    res.locals.flash = req.cookies.flash;

    if (req.cookies.flash) {
        res.clearCookie("flash");
    }
    next();
});
app.get('/', async (req, res) => {
    const stays = await stay.find({})
        .limit(8);

    const destinations = [
        {
            name: "Goa",
            image: "/images/goa.jpg"
        },
        {
            name: "Kerala",
            image: "/images/kerala.jpg"
        },
        {
            name: "Himachal",
            image: "/images/himachal.jpg"
        }
    ];

    res.render("home", {
        stays,
        destinations
    });
})
const reviewRoute = require("./routes/review")

app.use("/user", userRoute);
app.use("/stays", stayRoute);
app.use("/bookings", bookingRoute);
app.use("/stays/:id/reviews", reviewRoute);
app.use((req, res, next) => {
    res.status(404).render('404');
});
//universal error handler 
app.use((error, req, res, next) => {
    console.error(error.stack);
    
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(500).json({ success: false, message: error.message || "An error occurred" });
    }

    if (error.name === 'CastError') {
        res.cookie("flash", { type: "danger", message: "Invalid item requested." });
    } else {
        res.cookie("flash", { type: "danger", message: "Something went wrong!" });
    }

    const redirectUrl = req.get('referer') || '/';
    res.redirect(redirectUrl);
})

app.listen(process.env.SERVER_PORT, () => {
    console.log(`app is running on port ${process.env.SERVER_PORT}`)
})
