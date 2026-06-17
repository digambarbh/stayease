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
        
        // Fetch user to check blocked status
        const user = await User.findById(payload.id);
        if (!user || user.isBlocked) {
            res.clearCookie("token");
            res.cookie("flash", { type: "danger", message: "Your account has been blocked by an administrator." });
            return res.redirect("/user/login");
        }
        
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
