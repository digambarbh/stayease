const Joi = require('joi');

module.exports.userRegisterSchema = Joi.object({
    username: Joi.string().required().messages({
        'string.empty': 'Username is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email is required'
    }),
    phone: Joi.string().required().messages({
        'string.empty': 'Phone number is required'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.empty': 'Password is required'
    }),
    role: Joi.string().valid('user', 'host').required()
});

module.exports.userLoginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    redirect: Joi.string().allow('').optional()
});

module.exports.staySchema = Joi.object({
    stay: Joi.object({
        name: Joi.string().required(),
        location: Joi.string().required(),
        price: Joi.number().min(0).required(),
        description: Joi.string().required(),
        type: Joi.string().required(),
        capacity: Joi.number().min(1).required(),
        isAvailable: Joi.boolean()
    }).required(),
    deleteImages: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string()
    ).optional()
});

module.exports.bookingSchema = Joi.object({
    checkIn: Joi.date().iso().required(),
    checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required().messages({
        'date.greater': 'Check-out date must be after check-in date'
    }),
    guests: Joi.number().min(1).required()
});

module.exports.verifyPaymentSchema = Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
    stayId: Joi.string().required(),
    checkIn: Joi.date().iso().required(),
    checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
    guests: Joi.number().min(1).required(),
    totalPrice: Joi.number().required(),
    nights: Joi.number().min(1).required()
});
