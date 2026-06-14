# auth routes 
POST   /api/auth/register        → register user
POST   /api/auth/login           → login
POST   /api/auth/logout          → logout
PATCH  /api/auth/become-host     → upgrade to host
GET    /api/auth/me              → get current user


# stay routes 

GET    /api/stays                → get all stays (public)
GET    /api/stays/:id            → get one stay  (public)
POST   /api/stays                → create stay   (host)
PATCH  /api/stays/:id            → update stay   (host)
DELETE /api/stays/:id            → delete stay   (host)

GET    /api/stays/host/my-stays  → host's own listings
GET    /api/stays/search         → search + filter stays


# booking routes 

POST   /api/bookings             → create booking      (user)
GET    /api/bookings/my          → user's bookings     (user)
PATCH  /api/bookings/:id/cancel  → cancel booking      (user)

GET    /api/bookings/host        → incoming requests   (host)
PATCH  /api/bookings/:id/approve → approve booking     (host)
PATCH  /api/bookings/:id/reject  → reject booking      (host)

# payment routes

POST   /api/payment/create-order → create razorpay order
POST   /api/payment/verify       → verify payment
POST   /api/payment/refund/:id   → refund on rejection


# wishlist routes

POST   /api/wishlist/:stayId     → add to wishlist
DELETE /api/wishlist/:stayId     → remove from wishlist
GET    /api/wishlist             → get my wishlist

# user routes 

GET    /api/user/profile         → get profile
PATCH  /api/user/profile         → update profile
PATCH  /api/user/password        → change password
DELETE /api/user/account         → delete account