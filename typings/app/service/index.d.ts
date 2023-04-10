// This file is created by egg-ts-helper@1.34.7
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportAdmin from '../../../app/service/Admin';
import ExportChat from '../../../app/service/Chat';
import ExportRes from '../../../app/service/Res';
import ExportUser from '../../../app/service/User';
import ExportWechat from '../../../app/service/Wechat';

declare module 'egg' {
  interface IService {
    admin: AutoInstanceType<typeof ExportAdmin>;
    chat: AutoInstanceType<typeof ExportChat>;
    res: AutoInstanceType<typeof ExportRes>;
    user: AutoInstanceType<typeof ExportUser>;
    wechat: AutoInstanceType<typeof ExportWechat>;
  }
}
