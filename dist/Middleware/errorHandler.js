"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
var errorHandler = function (err, req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Credentials", "true");
    // MongoDB Atlas connection error
    if (err.name === "MongoServerSelectionError" ||
        err.message === "DB_CONNECTION_FAILED") {
        res.status(503).json({
            success: false,
            message: "Service temporarily unavailable. Please try again later.",
        });
    }
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal server error",
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map