
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../config/db");

exports.register = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      email,
      password,
      userType,
      businessName,
      address,
      village,
      district,
      pincode
    } = req.body;

    if (!fullName || !phone || !password || !userType || !address) {
      return res.status(400).json({
        message: "Please fill all required fields."
      });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Enter a valid 10-digit mobile number."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    if (!["Farmer", "Wholesaler", "Restaurant"].includes(userType)) {
      return res.status(400).json({
        message: "Invalid account type."
      });
    }

    if (userType === "Restaurant" && !businessName?.trim()) {
      return res.status(400).json({
        message: "Restaurant name is required."
      });
    }

    if (pincode && !/^[0-9]{6}$/.test(pincode)) {
      return res.status(400).json({
        message: "Enter a valid 6-digit pincode."
      });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const passwordHash = await bcrypt.hash(password, 12);

      const userResult = await new sql.Request(transaction)
        .input("FullName", sql.NVarChar(100), fullName.trim())
        .input("Phone", sql.VarChar(10), phone)
        .input("Email", sql.NVarChar(150), email || null)
        .input("PasswordHash", sql.NVarChar(255), passwordHash)
        .input("UserType", sql.VarChar(20), userType)
        .query(`
          INSERT INTO Users
          (FullName, PhoneNumber, Email, PasswordHash, UserType)
          OUTPUT INSERTED.UserId
          VALUES
          (@FullName, @Phone, @Email, @PasswordHash, @UserType)
        `);

      const userId = userResult.recordset[0].UserId;

      if (userType === "Farmer" || userType === "Wholesaler") {
        await new sql.Request(transaction)
          .input("UserId", sql.Int, userId)
          .input("BusinessName", sql.NVarChar(150), businessName || null)
          .input("SupplierType", sql.VarChar(20), userType)
          .input("Address", sql.NVarChar(300), address)
          .input("Village", sql.NVarChar(100), village || null)
          .input("District", sql.NVarChar(100), district || "Kadapa")
          .input("Pincode", sql.VarChar(6), pincode || null)
          .query(`
            INSERT INTO Suppliers
            (UserId, BusinessName, SupplierType, Address,
             Village, District, Pincode)
            VALUES
            (@UserId, @BusinessName, @SupplierType, @Address,
             @Village, @District, @Pincode)
          `);
      } else {
        await new sql.Request(transaction)
          .input("UserId", sql.Int, userId)
          .input("RestaurantName", sql.NVarChar(150), businessName.trim())
          .input("Address", sql.NVarChar(300), address)
          .input("District", sql.NVarChar(100), district || "Kadapa")
          .input("Pincode", sql.VarChar(6), pincode || null)
          .query(`
            INSERT INTO Restaurants
            (UserId, RestaurantName, Address, District, Pincode)
            VALUES
            (@UserId, @RestaurantName, @Address, @District, @Pincode)
          `);
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: "Registration completed successfully.",
        userId
      });

    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError.message);
      }
      throw error;
    }

  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({
        message: "This mobile number is already registered."
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed. Please try again."
    });
  }
};
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: "Phone number and password are required."
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input("Phone", sql.VarChar(10), phone)
      .query(`
        SELECT UserId, FullName, PhoneNumber,
               PasswordHash, UserType, IsActive
        FROM Users
        WHERE PhoneNumber = @Phone
      `);

    const user = result.recordset[0];

    if (!user || !user.IsActive) {
      return res.status(401).json({
        message: "Invalid phone number or password."
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.PasswordHash
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid phone number or password."
      });
    }

    const token = jwt.sign(
      {
        userId: user.UserId,
        role: user.UserType
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        userId: user.UserId,
        name: user.FullName,
        phone: user.PhoneNumber,
        role: user.UserType
      }
    });

} catch (error) {
  console.error("Login error:", error.message);

  return res.status(500).json({
    message: "Login failed. Please try again."
  });
}
};