const { userRegisterSchema, userLoginSchema, staySchema, bookingSchema, verifyPaymentSchema } = require('../schemas');

const validateSchema = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
        if (error) {
            const msg = error.details.map(el => el.message).join(', ');
            
            // Check if it's an API request (like /verify)
            if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
                return res.status(400).json({ success: false, message: msg });
            }

            res.cookie("flash", { type: "danger", message: msg });
            return res.redirect(req.get('referer') || '/');
        }
        next();
    };
};

module.exports.validateRegister = validateSchema(userRegisterSchema);
module.exports.validateLogin = validateSchema(userLoginSchema);
module.exports.validateStay = validateSchema(staySchema);
module.exports.validateBooking = validateSchema(bookingSchema);
module.exports.validateVerifyPayment = validateSchema(verifyPaymentSchema);
