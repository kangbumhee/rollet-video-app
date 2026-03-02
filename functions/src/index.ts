// functions/src/index.ts
import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { gameCycle } from './cycle/gameCycle';
export { runPhase } from './cycle/phaseRunner';
export { periodicHype } from './cycle/botResponder';

export { processGameRound } from './game/processRound';
export { advanceGame } from './game/advanceGame';

export { onWinnerDetermined } from './triggers/onWinner';
