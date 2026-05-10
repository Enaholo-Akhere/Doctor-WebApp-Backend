"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("tsconfig-paths/register");
var logger_1 = require("@utils/logger");
var express_1 = __importDefault(require("express"));
var app = (0, express_1.default)();
var PORT = 5000;
app.get('/', function (req, res) {
    res.send('welcome to my typescript world');
});
app.listen(PORT, function () {
    (0, logger_1.log)("App running on PORT: ".concat(PORT));
});
//# sourceMappingURL=index.js.map