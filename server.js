require("dotenv").config()
const express = require("express")
const app = express()
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
const bookingRoute=require("./routes/booking")
const stay = require("./model/stay")
connectDb()

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
app.get('/', async(req, res) => {
    const stays = await stay.find({})
        .limit(8);

    const destinations = [
        {
            name:"Goa",
            image:"/images/goa.jpg"
        },
        {
            name:"Kerala",
            image:"/images/kerala.jpg"
        },
        {
            name:"Himachal",
            image:"/images/himachal.jpg"
        }
    ];

    res.render("home", {
        stays,
        destinations
    });
})
app.use("/user", userRoute);
app.use("/stays", stayRoute);
app.use("/bookings",bookingRoute)










//universal error handler 
app.use((error, req, res, next) => {
    res.status(500).send(error.message)
})

app.listen(process.env.SERVER_PORT, () => {
    console.log(`app is running on port ${process.env.SERVER_PORT}`)
})
