// This file is created by egg-ts-helper@2.1.0
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAnnounce from '../../../app/model/Announce';
import ExportAuditLog from '../../../app/model/AuditLog';
import ExportChat from '../../../app/model/Chat';
import ExportConfig from '../../../app/model/Config';
import ExportDialog from '../../../app/model/Dialog';
import ExportEmbedding1 from '../../../app/model/Embedding1';
import ExportEmbedding2 from '../../../app/model/Embedding2';
import ExportHTTPLog from '../../../app/model/HTTPLog';
import ExportOpenAILog from '../../../app/model/OpenAILog';
import ExportPage from '../../../app/model/Page';
import ExportPayment from '../../../app/model/Payment';
import ExportPhoneCode from '../../../app/model/PhoneCode';
import ExportResource from '../../../app/model/Resource';
import ExportResourceType from '../../../app/model/ResourceType';
import ExportUser from '../../../app/model/User';
import ExportUserChance from '../../../app/model/UserChance';
import ExportUserResourceTab from '../../../app/model/UserResourceTab';

declare module 'egg' {
  interface IModel {
    Announce: ReturnType<typeof ExportAnnounce>;
    AuditLog: ReturnType<typeof ExportAuditLog>;
    Chat: ReturnType<typeof ExportChat>;
    Config: ReturnType<typeof ExportConfig>;
    Dialog: ReturnType<typeof ExportDialog>;
    Embedding1: ReturnType<typeof ExportEmbedding1>;
    Embedding2: ReturnType<typeof ExportEmbedding2>;
    HTTPLog: ReturnType<typeof ExportHTTPLog>;
    OpenAILog: ReturnType<typeof ExportOpenAILog>;
    Page: ReturnType<typeof ExportPage>;
    Payment: ReturnType<typeof ExportPayment>;
    PhoneCode: ReturnType<typeof ExportPhoneCode>;
    Resource: ReturnType<typeof ExportResource>;
    ResourceType: ReturnType<typeof ExportResourceType>;
    User: ReturnType<typeof ExportUser>;
    UserChance: ReturnType<typeof ExportUserChance>;
    UserResourceTab: ReturnType<typeof ExportUserResourceTab>;
  }
}
