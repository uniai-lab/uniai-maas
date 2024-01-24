// This file is created by egg-ts-helper@1.34.7
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAgent from '../../../app/controller/Agent';
import ExportIndex from '../../../app/controller/Index';
import ExportUniAI from '../../../app/controller/UniAI';
import ExportWeChat from '../../../app/controller/WeChat';
import ExportWeb from '../../../app/controller/Web';

declare module 'egg' {
  interface IController {
    agent: ExportAgent;
    index: ExportIndex;
    uniAI: ExportUniAI;
    weChat: ExportWeChat;
    web: ExportWeb;
  }
}
