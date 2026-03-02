"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameCycle = void 0;
// functions/src/index.ts
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
var gameCycle_1 = require("./cycle/gameCycle");
Object.defineProperty(exports, "gameCycle", { enumerable: true, get: function () { return gameCycle_1.gameCycle; } });
//# sourceMappingURL=index.js.map