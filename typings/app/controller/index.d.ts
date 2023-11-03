// This file is created by egg-ts-helper@2.1.0
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAdmin from '../../../app/controller/Admin';
import ExportIndex from '../../../app/controller/Index';
import ExportLeChat from '../../../app/controller/LeChat';
import ExportUniAI from '../../../app/controller/UniAI';
import ExportWeChat from '../../../app/controller/WeChat';

declare module 'egg' {
  interface IController {
    admin: ExportAdmin;
    index: ExportIndex;
    leChat: ExportLeChat;
    uniAI: ExportUniAI;
    weChat: ExportWeChat;
  }
}
