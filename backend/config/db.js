const sql = require("mssql/msnodesqlv8");

const config = {
    server: "localhost",
    database: "FreshConnectDB",
    driver: "ODBC Driver 18 for SQL Server",

    options: {
        trustedConnection: true,
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log("FreshConnect Database Connected Successfully!");
        return pool;
    })
    .catch(error => {
        console.error("Database Connection Failed:", error.message);
        throw error;
    });

module.exports = {
    sql,
    poolPromise
};