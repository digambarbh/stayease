const isAdmin = async (req, res, next) => {
    try {
        if (!res.locals.currentUser) {
            res.cookie("flash", { type: "danger", message: "You must be logged in to view this page." });
            return res.redirect("/user/login");
        }
        
        if (res.locals.currentUser.role !== 'admin') {
            res.cookie("flash", { type: "danger", message: "Access Denied: You do not have permission to access the admin dashboard." });
            return res.redirect("/");
        }
        
        next();
    } catch (e) {
        console.error(e);
        res.cookie("flash", { type: "danger", message: "Something went wrong validating permissions!" });
        res.redirect("/");
    }
}

module.exports = isAdmin;
