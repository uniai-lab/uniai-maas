// This file is created by egg-ts-helper@1.34.7
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAdmin from '../../../app/controller/Admin';
import ExportAssistant from '../../../app/controller/Assistant';
import ExportChat from '../../../app/controller/Chat';
import ExportIndex from '../../../app/controller/Index';
import ExportLeChat from '../../../app/controller/LeChat';

declare module 'egg' {
  interface IController {
    admin: ExportAdmin;
    assistant: ExportAssistant;
    chat: ExportChat;
    index: ExportIndex;
    leChat: ExportLeChat;
  }
}
