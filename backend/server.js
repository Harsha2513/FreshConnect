require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { poolPromise } = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Security: Required environment variables
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env file");
}

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10kb" }));

// Home API
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to FreshConnect API"
    });
});

// Test API
app.get("/api/auth/test", (req, res) => {
    res.json({
        success: true,
        message: "Server test route working!"
    });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api", marketplaceRoutes);
app.use("/api/admin", adminRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Server error:", err.message);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

// Start Server
const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await poolPromise;

        app.listen(PORT, () => {
            console.log(`FreshConnect API running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();