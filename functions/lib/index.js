"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundTimeoutCheck = exports.onRoundActionSubmit = exports.autoGameScheduler = exports.gameCycle = void 0;
// functions/src/index.ts
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
var gameCycle_1 = require("./cycle/gameCycle");
Object.defineProperty(exports, "gameCycle", { enumerable: true, get: function () { return gameCycle_1.gameCycle; } });
var autoGameScheduler_1 = require("./cycle/autoGameScheduler");
Object.defineProperty(exports, "autoGameScheduler", { enumerable: true, get: function () { return autoGameScheduler_1.autoGameScheduler; } });
var onRoundAction_1 = require("./triggers/onRoundAction");
Object.defineProperty(exports, "onRoundActionSubmit", { enumerable: true, get: function () { return onRoundAction_1.onRoundActionSubmit; } });
var roundTimeout_1 = require("./triggers/roundTimeout");
Object.defineProperty(exports, "roundTimeoutCheck", { enumerable: true, get: function () { return roundTimeout_1.roundTimeoutCheck; } });
//# sourceMappingURL=index.js.map