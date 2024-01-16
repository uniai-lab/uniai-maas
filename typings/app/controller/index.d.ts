// This file is created by egg-ts-helper@2.1.0
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportIndex from '../../../app/controller/Index';
import ExportLeChat from '../../../app/controller/LeChat';
import ExportUniAI from '../../../app/controller/UniAI';
import ExportWeChat from '../../../app/controller/WeChat';
import ExportWeb from '../../../app/controller/Web';

declare module 'egg' {
  interface IController {
    index: ExportIndex;
    leChat: ExportLeChat;
    uniAI: ExportUniAI;
    weChat: ExportWeChat;
    web: ExportWeb;
  }
}
