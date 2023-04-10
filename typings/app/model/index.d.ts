// This file is created by egg-ts-helper@1.34.7
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportChat from '../../../app/model/Chat';
import ExportConfig from '../../../app/model/Config';
import ExportDialog from '../../../app/model/Dialog';
import ExportOpenAILog from '../../../app/model/OpenAILog';
import ExportPage from '../../../app/model/Page';
import ExportPhoneCode from '../../../app/model/PhoneCode';
import ExportPrompt from '../../../app/model/Prompt';
import ExportResource from '../../../app/model/Resource';
import ExportResourceType from '../../../app/model/ResourceType';
import ExportSensitiveWord from '../../../app/model/SensitiveWord';
import ExportUser from '../../../app/model/User';
import ExportUserChance from '../../../app/model/UserChance';

declare module 'egg' {
  interface IModel {
    Chat: ReturnType<typeof ExportChat>;
    Config: ReturnType<typeof ExportConfig>;
    Dialog: ReturnType<typeof ExportDialog>;
    OpenAILog: ReturnType<typeof ExportOpenAILog>;
    Page: ReturnType<typeof ExportPage>;
    PhoneCode: ReturnType<typeof ExportPhoneCode>;
    Prompt: ReturnType<typeof ExportPrompt>;
    Resource: ReturnType<typeof ExportResource>;
    ResourceType: ReturnType<typeof ExportResourceType>;
    SensitiveWord: ReturnType<typeof ExportSensitiveWord>;
    User: ReturnType<typeof ExportUser>;
    UserChance: ReturnType<typeof ExportUserChance>;
  }
}
