const { sql, poolPromise } = require("../config/db");

// Save admin activity
async function logActivity(adminId, action, description) {
  const pool = await poolPromise;

  await pool.request()
    .input("AdminId", sql.Int, adminId)
    .input("Action", sql.NVarChar(50), action)
    .input("Description", sql.NVarChar(500), description)
    .query(`
      INSERT INTO AdminActivityLogs
      (AdminUserId, ActionType, Description)
      VALUES (@AdminId, @Action, @Description)
    `);
}

// Dashboard overview
exports.overview = async (_req, res) => {
  try {
    const pool = await poolPromise;

    const [users, suppliers, restaurants, products, orders, sales] =
      await Promise.all([
        pool.request().query(`
          SELECT COUNT(*) AS total,
          SUM(CASE WHEN IsActive=1 THEN 1 ELSE 0 END) AS active
          FROM Users
        `),

        pool.request().query(`
          SELECT COUNT(*) AS total FROM Suppliers
        `),

        pool.request().query(`
          SELECT COUNT(*) AS total FROM Restaurants
        `),

        pool.request().query(`
          SELECT COUNT(*) AS total,
          SUM(CASE WHEN IsActive=1 THEN 1 ELSE 0 END) AS active
          FROM Products
        `),

        pool.request().query(`
          SELECT COUNT(*) AS total,
          SUM(CASE WHEN OrderStatus='Pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN OrderStatus='Delivered' THEN 1 ELSE 0 END) AS delivered
          FROM Orders
        `),

        pool.request().query(`
          SELECT COALESCE(SUM(
            CASE WHEN ItemStatus='Delivered'
            THEN COALESCE(LineTotal, UnitPrice*Quantity)
            ELSE 0 END
          ),0) AS deliveredSales
          FROM OrderItems
        `)
      ]);

    res.json({
      users: users.recordset[0],
      suppliers: suppliers.recordset[0].total,
      restaurants: restaurants.recordset[0].total,
      products: products.recordset[0],
      orders: orders.recordset[0],
      deliveredSales: sales.recordset[0].deliveredSales
    });

  } catch (e) {
    console.error("Admin overview:", e);
    res.status(500).json({ message: "Could not load admin overview." });
  }
};

// Users
exports.users = async (_req, res) => {
  try {
    const pool = await poolPromise;

    const r = await pool.request().query(`
      SELECT
        u.UserId AS userId,
        u.FullName AS name,
        u.PhoneNumber AS phone,
        u.Email AS email,
        u.UserType AS role,
        u.IsActive AS isActive,
        COALESCE(s.BusinessName,r.RestaurantName) AS businessName,
        COALESCE(s.District,r.District) AS district
      FROM Users u
      LEFT JOIN Suppliers s ON s.UserId=u.UserId
      LEFT JOIN Restaurants r ON r.UserId=u.UserId
      ORDER BY u.UserId DESC
    `);

    res.json(r.recordset);

  } catch (e) {
    console.error("Admin users:", e);
    res.status(500).json({ message: "Could not load users." });
  }
};

// Activate / deactivate users
exports.setUserStatus = async (req, res) => {
  const userId = Number(req.params.userId);
  const isActive = req.body.isActive;

  if (!Number.isInteger(userId) || userId <= 0 ||
      typeof isActive !== "boolean") {
    return res.status(400).json({
      message: "Valid user and status are required."
    });
  }

  if (userId === req.user.userId && !isActive) {
    return res.status(400).json({
      message: "You cannot deactivate your own admin account."
    });
  }

  try {
    const pool = await poolPromise;

    const r = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("IsActive", sql.Bit, isActive)
      .query(`
        UPDATE Users
        SET IsActive=@IsActive
        WHERE UserId=@UserId AND UserType<>'Admin';

        SELECT @@ROWCOUNT AS changed;
      `);

    if (!r.recordset[0].changed) {
      return res.status(404).json({
        message: "User not found or cannot be changed."
      });
    }

    await logActivity(
      req.user.userId,
      "USER_STATUS",
      `User ${userId} ${isActive ? "activated" : "deactivated"}`
    );

    res.json({ success: true, message: "User status updated." });

  } catch (e) {
    console.error("Admin user status:", e);
    res.status(500).json({ message: "Could not update user status." });
  }
};

// Products
exports.products = async (_req, res) => {
  try {
    const pool = await poolPromise;

    const r = await pool.request().query(`
      SELECT
        p.ProductId AS productId,
        p.ProductName AS name,
        p.Category AS category,
        p.Price AS price,
        p.Stock AS stock,
        p.Unit AS unit,
        p.IsActive AS isActive,
        s.BusinessName AS supplier,
        u.FullName AS supplierName
      FROM Products p
      JOIN Suppliers s ON s.SupplierId=p.SupplierId
      JOIN Users u ON u.UserId=s.UserId
      ORDER BY p.CreatedAt DESC
    `);

    res.json(r.recordset);

  } catch (e) {
    console.error("Admin products:", e);
    res.status(500).json({ message: "Could not load products." });
  }
};

// Activate / hide products
exports.setProductStatus = async (req, res) => {
  const productId = Number(req.params.productId);
  const isActive = req.body.isActive;

  if (!Number.isInteger(productId) || productId <= 0 ||
      typeof isActive !== "boolean") {
    return res.status(400).json({
      message: "Valid product and status are required."
    });
  }

  try {
    const pool = await poolPromise;

    const r = await pool.request()
      .input("Id", sql.Int, productId)
      .input("Active", sql.Bit, isActive)
      .query(`
        UPDATE Products
        SET IsActive=@Active, UpdatedAt=SYSUTCDATETIME()
        WHERE ProductId=@Id;

        SELECT @@ROWCOUNT AS changed;
      `);

    if (!r.recordset[0].changed) {
      return res.status(404).json({ message: "Product not found." });
    }

    await logActivity(
      req.user.userId,
      "PRODUCT_STATUS",
      `Product ${productId} ${isActive ? "published" : "hidden"}`
    );

    res.json({ success: true, message: "Product status updated." });

  } catch (e) {
    console.error("Admin product status:", e);
    res.status(500).json({ message: "Could not update product." });
  }
};

// All orders
exports.orders = async (_req, res) => {
  try {
    const pool = await poolPromise;

    const r = await pool.request().query(`
      SELECT
        o.OrderId AS orderId,
        oi.OrderItemId AS itemId,
        o.OrderStatus AS status,
        o.TotalAmount AS total,
        o.CreatedAt AS createdAt,
        o.DeliveryAddress AS deliveryAddress,
        r.RestaurantName AS restaurant,
        oi.ProductName AS productName,
        oi.Quantity AS quantity,
        oi.Unit AS unit,
        oi.UnitPrice AS unitPrice,
        oi.ItemStatus AS itemStatus,
        s.BusinessName AS supplier
      FROM Orders o
      JOIN Restaurants r ON r.RestaurantId=o.RestaurantId
      JOIN OrderItems oi ON oi.OrderId=o.OrderId
      JOIN Suppliers s ON s.SupplierId=oi.SupplierId
      ORDER BY o.CreatedAt DESC
    `);

    res.json(r.recordset);

  } catch (e) {
    console.error("Admin orders:", e);
    res.status(500).json({ message: "Could not load orders." });
  }
};

// Admin order item status management
exports.setOrderItemStatus = async (req, res) => {
  const itemId = Number(req.params.itemId);
  const status = req.body.status;

  const allowed = [
    "Accepted",
    "Processing",
    "OutForDelivery",
    "Delivered"
  ];

  if (!Number.isInteger(itemId) || itemId <= 0 ||
      !allowed.includes(status)) {
    return res.status(400).json({
      message: "Valid order item and status are required."
    });
  }

  try {
    const pool = await poolPromise;
    const tx = new sql.Transaction(pool);

    await tx.begin();

    try {
      const current = await new sql.Request(tx)
        .input("ItemId", sql.Int, itemId)
        .query(`
          SELECT OrderId, ItemStatus
          FROM OrderItems WITH (UPDLOCK, ROWLOCK)
          WHERE OrderItemId=@ItemId
        `);

      if (!current.recordset.length) {
        throw new Error("Order item not found.");
      }

      const item = current.recordset[0];

      if (item.ItemStatus === "Cancelled") {
        throw new Error("Cancelled items cannot be updated.");
      }

      await new sql.Request(tx)
        .input("ItemId", sql.Int, itemId)
        .input("Status", sql.VarChar(20), status)
        .query(`
          UPDATE OrderItems
          SET ItemStatus=@Status
          WHERE OrderItemId=@ItemId
        `);

      await new sql.Request(tx)
        .input("OrderId", sql.Int, item.OrderId)
        .query(`
UPDATE Orders
SET OrderStatus = CASE

  WHEN NOT EXISTS (
    SELECT 1
    FROM OrderItems
    WHERE OrderId = @OrderId
      AND ItemStatus <> 'Cancelled'
  ) THEN 'Cancelled'

  WHEN NOT EXISTS (
    SELECT 1
    FROM OrderItems
    WHERE OrderId = @OrderId
      AND ItemStatus NOT IN ('Delivered', 'Cancelled')
  ) THEN 'Delivered'

  WHEN EXISTS (
    SELECT 1
    FROM OrderItems
    WHERE OrderId = @OrderId
      AND ItemStatus IN (
        'Processing',
        'OutForDelivery',
        'Accepted',
        'Delivered'
      )
  ) THEN 'Processing'

  ELSE 'Pending'

END,
UpdatedAt = SYSUTCDATETIME()
WHERE OrderId = @OrderId;        `);

      await tx.commit();

      await logActivity(
        req.user.userId,
        "ORDER_STATUS",
        `Order item ${itemId} updated to ${status}`
      );

      res.json({ success: true, message: "Order status updated." });

    } catch (e) {
      await tx.rollback();
      throw e;
    }

  } catch (e) {
    console.error("Admin order status:", e);

    res.status(e.message === "Order item not found." ? 404 : 400)
      .json({ message: e.message || "Could not update order status." });
  }
};

// Revenue analytics
exports.analytics = async (_req, res) => {
  try {
    const pool = await poolPromise;

    const [daily, monthly, summary] = await Promise.all([
      pool.request().query(`
        SELECT
          CAST(o.CreatedAt AS DATE) AS date,
          SUM(COALESCE(oi.LineTotal, oi.UnitPrice*oi.Quantity)) AS revenue
        FROM Orders o
        JOIN OrderItems oi ON oi.OrderId=o.OrderId
        WHERE oi.ItemStatus='Delivered'
        AND o.CreatedAt >= DATEADD(DAY,-6,CAST(GETDATE() AS DATE))
        GROUP BY CAST(o.CreatedAt AS DATE)
        ORDER BY date
      `),

      pool.request().query(`
        SELECT
          YEAR(o.CreatedAt) AS year,
          MONTH(o.CreatedAt) AS month,
          SUM(COALESCE(oi.LineTotal, oi.UnitPrice*oi.Quantity)) AS revenue
        FROM Orders o
        JOIN OrderItems oi ON oi.OrderId=o.OrderId
        WHERE oi.ItemStatus='Delivered'
        AND o.CreatedAt >= DATEADD(MONTH,-11,GETDATE())
        GROUP BY YEAR(o.CreatedAt), MONTH(o.CreatedAt)
        ORDER BY year, month
      `),

      pool.request().query(`
        SELECT
          COUNT(DISTINCT CASE
            WHEN oi.ItemStatus='Delivered' THEN o.OrderId
          END) AS deliveredOrders,
          COALESCE(SUM(CASE
            WHEN oi.ItemStatus='Delivered'
            THEN COALESCE(oi.LineTotal,oi.UnitPrice*oi.Quantity)
            ELSE 0 END),0) AS totalRevenue
        FROM Orders o
        JOIN OrderItems oi ON oi.OrderId=o.OrderId
      `)
    ]);

    res.json({
      daily: daily.recordset,
      monthly: monthly.recordset,
      summary: summary.recordset[0]
    });

  } catch (e) {
    console.error("Admin analytics:", e);
    res.status(500).json({ message: "Could not load analytics." });
  }
};

// Activity logs
exports.activityLogs = async (_req, res) => {
  try {
    const pool = await poolPromise;

    const r = await pool.request().query(`
      SELECT TOP 100
        l.LogId AS logId,
        l.ActionType AS action,
        l.Description AS description,
        l.CreatedAt AS createdAt,
        u.FullName AS adminName
      FROM AdminActivityLogs l
      JOIN Users u ON u.UserId=l.AdminUserId
      ORDER BY l.CreatedAt DESC
    `);

    res.json(r.recordset);

  } catch (e) {
    console.error("Admin activity logs:", e);
    res.status(500).json({ message: "Could not load activity logs." });
  }
};