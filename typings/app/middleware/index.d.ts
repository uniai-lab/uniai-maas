// This file is created by egg-ts-helper@2.1.0
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAuthB from '../../../app/middleware/authB';
import ExportAuthC from '../../../app/middleware/authC';
import ExportCaptcha from '../../../app/middleware/captcha';
import ExportErrorHandler from '../../../app/middleware/errorHandler';
import ExportLog from '../../../app/middleware/log';
import ExportNotFound from '../../../app/middleware/notFound';
import ExportTransaction from '../../../app/middleware/transaction';

declare module 'egg' {
  interface IMiddleware {
    authB: typeof ExportAuthB;
    authC: typeof ExportAuthC;
    captcha: typeof ExportCaptcha;
    errorHandler: typeof ExportErrorHandler;
    log: typeof ExportLog;
    notFound: typeof ExportNotFound;
    transaction: typeof ExportTransaction;
  }
}
