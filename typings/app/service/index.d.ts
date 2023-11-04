// This file is created by egg-ts-helper@2.1.0
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportAdmin from '../../../app/service/Admin';
import ExportLeChat from '../../../app/service/LeChat';
import ExportRes from '../../../app/service/Res';
import ExportUniAI from '../../../app/service/UniAI';
import ExportWeChat from '../../../app/service/WeChat';

declare module 'egg' {
  interface IService {
    admin: AutoInstanceType<typeof ExportAdmin>;
    leChat: AutoInstanceType<typeof ExportLeChat>;
    res: AutoInstanceType<typeof ExportRes>;
    uniAI: AutoInstanceType<typeof ExportUniAI>;
    weChat: AutoInstanceType<typeof ExportWeChat>;
  }
}
