// functions/src/index.ts
import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { gameCycle } from './cycle/gameCycle';
export { autoGameScheduler } from './cycle/autoGameScheduler';
