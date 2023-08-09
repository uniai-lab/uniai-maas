# <img src="./logo.png" width=33 height=33 /> UniAI 中文说明

[English Version](./README.md)

![Framework](./framework.png)

## 示范案例

哪些软件正在使用UniAI？通过以下案例体验UniAI！

![wechat miniapps](./miniapp-qrcode.png)

_注: 以上小程序示例均使用UniAI的GLM模型！_

## 关于

UniAI旨在简化您与复杂AI模型的交互，不再为选择合适的模型而烦恼！

我们是开源的，并准备帮助您。

## 愿景

我们的目标是提供一个基于API的平台，集成各种AI模型和工具。通过UniAI，复杂的AI实现变得轻松且流畅。

## 前置环境

在开始之前，请确保您已安装以下内容：

- Node.js >= 18.x
- TypeScript >= 4.x
- Docker
- Docker-compose

## 入门指南

### 配置

1. 在根目录创建一个 `.env` 文件：

   ```bash
   touch ./.env
   ```

2. 将环境参数填写到 `.env` 文件中，如下所示：

```bash
# APP
APP_NAME=UniAI
APP_URL=https://www.uniai.us
DEFAULT_AVATAR_AI=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-lechat.png
DEFAULT_AVATAR_USER=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-user.png
DEFAULT_USERNAME=AI
ADMIN_TOKEN=[Your Admin Token]

# GPT
OPENAI_API=http://8.214.93.3 # openai proxy
OPENAI_API_KEY=[Your openAI key] # add your key
OPENAI_EMBED_DIM=1536

# GLM
GLM_API=http://10.144.1.7:8100 # your GLM deployed server
GLM_EMBED_DIM=1024

# PostgreSQL database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=uniai

# Redis cache
REDIS_PORT=6379

# WeChat
WX_APP_ID=[Wechat miniapp app id]
WX_APP_SECRET=[Wechat miniapp app secret]
WX_APP_AUTH_URL=https://api.weixin.qq.com/sns/jscode2session
WX_APP_ACCESS_TOKEN_URL=https://api.weixin.qq.com/cgi-bin/token
WX_APP_PHONE_URL=https://api.weixin.qq.com/wxa/business/getuserphonenumber
WX_APP_MSG_CHECK=https://api.weixin.qq.com/wxa/msg_sec_check

# COS, OSS storage
COS_SECRET_ID=[Tencent COS secret id]
COS_SECRET_KEY=[Tencent COS secret key]
COS_BUCKET=[Tencent COS bucket]
COS_REGION=[Tencent COS region]

# Google Search
GOOGLE_SEARCH_API_TOKEN=[Google search API token]
GOOGLE_SEARCH_ENGINE_ID=[Google search engine ID]

# Stable Diffusion
STABLE_DIFFUSION_API=http://10.144.1.7:3400/sdapi/v1
```

### 安装

我们建议使用 `yarn` 替代 `npm`：

```bash
npm -g install yarn
yarn
```

### 启动数据库

如果您还没有类似Milvus或PostgresSQL（pgvector）的向量数据库，您可以使用Docker和Docker-compose启动一个：

```bash
yarn docker up pgvector
```

### 初始化数据库

```bash
yarn pg init --force
```

## 运行 UniAI

### 开发模式

```bash
yarn dev
```

### 生产模式

```bash
yarn tsc
yarn start
```

⚠️ 在开发模式下不要编译TypeScript文件。如果已经使用 `tsc` 命令进行了编译，请在运行 `yarn dev` 之前使用 `yarn clean` 进行清理。

### 清理

```bash
yarn clean
```

## 文档

UniAI的接口全部采用Web API方式访问。

请参阅以下文档：
[https://documenter.getpostman.com/view/9347507/2s93Y5Pf2J](https://documenter.getpostman.com/view/9347507/2s93Y5Pf

## 模型

UniAI 不断整合更多的 AI 模型，扩展 AI 实用程序。然而，UniAI 不是独立的实体。由于它充当 AI 模型、工具和插件的整合和连接点，您需要自行部署所需的特定模型。我们为这些模型提供下载链接和指南。

### NLP 模型

- OpenAI GPT：[https://www.npmjs.com/package/openai](https://www.npmjs.com/package/openai)
- GLM/ChatGLM：[https://github.com/uni-openai/GLM-API](https://github.com/uni-openai/GLM-API)

### CV 模型

- Stable Diffusion：[https://github.com/uni-openai/stable-diffusion-simple](https://github.com/uni-openai/stable-diffusion-simple)

## 未来计划

UniAI 将不断发展，为以下主要模块提供更多的 AI 能力：

- 预测接口
- 训练接口
- 提示接口
- 资源接口

## 贡献者

我们欢迎您的贡献！如需更多信息，请联系 devilyouwei <huangyw@iict.ac.cn>。

_由 [Egg.js](https://www.eggjs.org/) TypeScript 驱动_
