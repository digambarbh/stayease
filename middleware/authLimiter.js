
const rateLimit = require("express-rate-limit");
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,

    handler: (req, res) => {
        res.cookie("flash", {
            type: "danger",
            message: "Too many login attempts. Try again later."
        });

        res.redirect("/user/login");
    }
});

module.exports=authLimiter