const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const admin = require("../controllers/adminController");

router.use(auth, authorize("Admin"));

router.get("/overview", admin.overview);

router.get("/users", admin.users);
router.patch("/users/:userId/status", admin.setUserStatus);

router.get("/products", admin.products);
router.patch("/products/:productId/status", admin.setProductStatus);

router.get("/orders", admin.orders);
router.patch("/orders/:itemId/status", admin.setOrderItemStatus);

router.get("/analytics", admin.analytics);
router.get("/activity-logs", admin.activityLogs);

module.exports = router;