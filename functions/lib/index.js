"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onWinnerDetermined = exports.advanceGame = exports.processGameRound = exports.periodicHype = exports.runPhase = exports.gameCycle = void 0;
// functions/src/index.ts
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
var gameCycle_1 = require("./cycle/gameCycle");
Object.defineProperty(exports, "gameCycle", { enumerable: true, get: function () { return gameCycle_1.gameCycle; } });
var phaseRunner_1 = require("./cycle/phaseRunner");
Object.defineProperty(exports, "runPhase", { enumerable: true, get: function () { return phaseRunner_1.runPhase; } });
var botResponder_1 = require("./cycle/botResponder");
Object.defineProperty(exports, "periodicHype", { enumerable: true, get: function () { return botResponder_1.periodicHype; } });
var processRound_1 = require("./game/processRound");
Object.defineProperty(exports, "processGameRound", { enumerable: true, get: function () { return processRound_1.processGameRound; } });
var advanceGame_1 = require("./game/advanceGame");
Object.defineProperty(exports, "advanceGame", { enumerable: true, get: function () { return advanceGame_1.advanceGame; } });
var onWinner_1 = require("./triggers/onWinner");
Object.defineProperty(exports, "onWinnerDetermined", { enumerable: true, get: function () { return onWinner_1.onWinnerDetermined; } });
//# sourceMappingURL=index.js.map