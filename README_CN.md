# <img src="./logo.png" width=33 height=33 /> UniAI

[English](./README.md)

## 关于 UniAI

UniAI 旨在简化您与复杂 AI 模型的互动。没有更多为选择正确的模型而苦恼，或在技术细节中迷失的困扰，我们是开源的，准备帮助您。

## 我们的愿景

我们的目标是提供一个基于 API 的平台，整合各种 AI 模型和工具。使用 UniAI，复杂的 AI 实现变得无需大费周章，更加简洁流畅。

## 开始前准备

在开始之前，请确保您已安装：

- Node.js (版本 18 或更高)
- Docker 和 Docker-compose

## 开始使用

### 配置

1. 在根目录下创建一个 `.env` 文件：

   ```bash
   touch ./.env
   ```
2. 在 `.env` 文件中按照以下格式填写环境参数：

   ```bash
   # APP
   APP_NAME=UniAI
   APP_URL=[您的应用域名]

   # GPT
   OPENAI_PROXY=[您的 OpenAI 代理]
   OPENAI_API_KEY=[您的 OpenAI API 密钥]
   OPENAI_EMBED_DIM=1536

   # GLM
   GLM_API=[您的 GLM API]
   TEXT2VEC_EMBED_DIM=1024

   # PostgreSQL 数据库
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=openai

   # Redis 缓存
   REDIS_PORT=6379

   # 微信
   WX_APP_ID=[您的微信小程序应用 id]
   WX_APP_SECRET=[您的微信小程序应用密钥]
   WX_APP_AUTH_URL=https://api.weixin.qq.com/sns/jscode2session
   WX_APP_ACCESS_TOKEN_URL=https://api.weixin.qq.com/cgi-bin/token
   WX_APP_PHONE_URL=https://api.weixin.qq.com/wxa/business/getuserphonenumber
   WX_APP_MSG_CHECK=https://api.weixin.qq.com/wxa/msg_sec_check

   # COS，OSS 存储
   COS_SECRET_ID=[您的腾讯 COS 服务秘钥 id]
   COS_SECRET_KEY=[您的腾讯 COS 服务秘钥]
   COS_BUCKET=[您的腾讯 COS 服务桶名]
   COS_REGION=[您的腾讯 COS 服务地区]

   # Google 搜索
   GOOGLE_SEARCH_API_TOKEN=[您的 Google API 密钥]
   GOOGLE_SEARCH_ENGINE_ID=[您的 Google 引擎 ID]

   # 稳定扩散
   STABLE_DIFFUSION_API=http://10.144.1.7:3400/sdapi/v1

   # 应用默认配置
   ADMIN_TOKEN=[您的管理员密钥]
   DEFAULT_AVATAR_AI=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-ai.png
   DEFAULT_AVATAR_USER=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-user.png
   DEFAULT_USERNAME=user
   ```

### 安装

我们建议使用 `yarn` 而不是 `npm`：

```bash
npm -g install yarn
yarn
```

### 启动数据库

如果您尚未有向量数据库，例如 Milvus 或 PostgresSQL (pgvector)，您可以使用 Docker 和 Docker-compose 启动一个：

```bash
yarn docker up pgvector
```

### 数据库初始化

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

⚠️ 在开发模式下，请不要编译 TypeScript 文件。如果您已运行过 `tsc`，在执行 `yarn dev` 前请先使用 `yarn clean`。

### 清理

```bash
yarn clean
```

## 软件需求

- Node.js >= 18.x
- TypeScript >= 4.x
- Docker
- Docker-compose

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
