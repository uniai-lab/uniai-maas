// This file is created by egg-ts-helper@1.34.7
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAI from '../../../app/controller/AI';
import ExportAdmin from '../../../app/controller/Admin';
import ExportChat from '../../../app/controller/Chat';
import ExportIndex from '../../../app/controller/Index';
import ExportLeChat from '../../../app/controller/LeChat';

declare module 'egg' {
  interface IController {
    aI: ExportAI;
    admin: ExportAdmin;
    chat: ExportChat;
    index: ExportIndex;
    leChat: ExportLeChat;
  }
}
