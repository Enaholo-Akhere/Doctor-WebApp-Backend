"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
require("tsconfig-paths/register");
var express_1 = __importDefault(require("express"));
var cookie_parser_1 = __importDefault(require("cookie-parser"));
var cors_1 = __importDefault(require("cors"));
var error_handler_1 = __importDefault(require("utils/error_handler"));
var Routers_1 = __importDefault(require("Routers"));
require("config/cloudinaryConfig");
var StartServer_1 = require("Starters/StartServer");
var errorHandler_1 = require("Middleware/errorHandler");
var app = (0, express_1.default)();
var PORT = Number(process.env.PORT) || 3000;
var corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
(0, error_handler_1.default)();
// app.options('*', cors(corsOptions)) // Enable CORS pre-flight for all routes
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/api/v1', Routers_1.default);
app.get('/', function (req, res) {
    res.status(200).json({ message: "Welcome to the API" });
});
(0, StartServer_1.startServer)(app);
app.use(errorHandler_1.errorHandler);
//# sourceMappingURL=server.js.map