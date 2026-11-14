const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const c = require("../controllers/marketplaceController");

const supplierOnly = [auth, authorize("Farmer", "Wholesaler")];
const restaurantOnly = [auth, authorize("Restaurant")];

// Public marketplace
router.get("/products", c.listProducts);

// Farmer / wholesaler product and sales management
router.get("/my-products", ...supplierOnly, c.myProducts);
router.post("/products", ...supplierOnly, c.addProduct);
router.put("/products/:id", ...supplierOnly, c.updateProduct);
router.delete("/products/:id", ...supplierOnly, c.deleteProduct);
router.patch("/products/:id/stock", ...supplierOnly, c.updateStock);
router.get("/farmer-orders", ...supplierOnly, c.farmerOrders);
router.patch("/order-items/:itemId/status", ...supplierOnly, c.updateOrderItemStatus);
router.get("/sales", ...supplierOnly, c.sales);

// Restaurant ordering
router.post("/orders", ...restaurantOnly, c.placeOrder);
router.get("/restaurant-orders", ...restaurantOnly, c.restaurantOrders);

// Both account types can view/update their own profile
router.get("/profile", auth, c.profile);
router.put("/profile", auth, c.updateProfile);

module.exports = router;
