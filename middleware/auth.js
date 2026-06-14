const User = require("../model/user")
const Blacklist = require("../model/blacklist")
const jwt = require("jsonwebtoken")
require('dotenv').config()
const checkAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            const redirectTo = encodeURIComponent(req.originalUrl)
            return res.redirect(`/user/login?redirect=${redirectTo}`)
        }
        const isBlacklisted = await Blacklist.findOne({ token })
        if (isBlacklisted) {
            res.clearCookie("token")
            return res.redirect("/user/login")
        }
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.user = payload.id
        next()
    }
    catch (e) {
        if (e.name === "TokenExpiredError") {
            res.clearCookie('token');
            return res.redirect('/user/login');
        }
        next(e)
    }
}




module.exports = checkAuth
