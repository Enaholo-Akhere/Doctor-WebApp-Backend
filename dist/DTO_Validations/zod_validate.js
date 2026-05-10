"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var appError_1 = require("@utils/appError");
var validate = function (schema) { return function (req, res, next) {
    var _a, _b;
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params
        });
        next();
    }
    catch (error) {
        console.error("Validation error:", error.errors);
        next((0, appError_1.appError)({
            message: ((_b = (_a = error.errors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) || "Validation failed",
            statusCode: 400,
        }));
    }
}; };
exports.default = validate;
//# sourceMappingURL=zod_validate.js.map