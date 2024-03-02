// This file is created by egg-ts-helper@2.1.0
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportAgent from '../../../app/service/Agent';
import ExportPay from '../../../app/service/Pay';
import ExportRes from '../../../app/service/Res';
import ExportUniAI from '../../../app/service/UniAI';
import ExportUser from '../../../app/service/User';
import ExportUtil from '../../../app/service/Util';
import ExportWeChat from '../../../app/service/WeChat';
import ExportWeb from '../../../app/service/Web';

declare module 'egg' {
  interface IService {
    agent: AutoInstanceType<typeof ExportAgent>;
    pay: AutoInstanceType<typeof ExportPay>;
    res: AutoInstanceType<typeof ExportRes>;
    uniAI: AutoInstanceType<typeof ExportUniAI>;
    user: AutoInstanceType<typeof ExportUser>;
    util: AutoInstanceType<typeof ExportUtil>;
    weChat: AutoInstanceType<typeof ExportWeChat>;
    web: AutoInstanceType<typeof ExportWeb>;
  }
}
