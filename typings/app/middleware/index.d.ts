// This file is created by egg-ts-helper@1.34.7
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAuth from '../../../app/middleware/auth';
import ExportNotFound from '../../../app/middleware/notFound';

declare module 'egg' {
  interface IMiddleware {
    auth: typeof ExportAuth;
    notFound: typeof ExportNotFound;
  }
}