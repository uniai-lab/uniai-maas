# <img src="./logo.png" width=31 height=31 /> UniAI

[简体中文版](./README_CN.md)

![框架](./framework.png)

## 已支持模型

- [OpenAI GPT](https://platform.openai.com/)
- [OpenAI DALL-E](https://platform.openai.com/)
- [THUDM GLM](https://github.com/THUDM/ChatGLM-6B)
- [Stable Diffusion](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
- [IFLYTEK Spark](https://xinghuo.xfyun.cn/)

## 示例

谁在使用UniAI，我在哪里可以体验它？

![微信小程序](./miniapp-qrcode.png)

_注意：上述所有小程序示例都依赖于UniAI的GLM模型！_

## 关于UniAI

UniAI旨在简化您与多个复杂AI模型的交互。

我们旨在提供一个基于API的平台，集成了各种AI模型和实用工具。

## 环境要求

在开始之前，请确保您具备以下条件：

- Node.js >= 18.x
- TypeScript >= 4.x
- Docker
- Docker-compose

## 入门指南

### 配置

1. 在根目录创建一个 `.env`文件：

```bash
touch ./.env
```

2. 填写 `.env`文件中的环境参数如下：

```bash
# APP
APP_NAME=UniAI
APP_URL=https://www.uniai.us
DEFAULT_AVATAR_AI=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-lechat.png
DEFAULT_AVATAR_USER=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-user.png
DEFAULT_USERNAME=AI
ADMIN_TOKEN=[您的管理员令牌]

# GPT
OPENAI_API=[您的OpenAI代理URL]
OPENAI_API_KEY=[您的OpenAI密钥]
OPENAI_EMBED_DIM=1536

# GLM
GLM_API=[您的ChatGLM模型API URL]
GLM_EMBED_DIM=1024

# IFLYTEK
SPARK_API=ws://spark-api.xf-yun.com
SPARK_API_KEY=[IFLYTEK API密钥]
SPARK_API_SECRET=[IFLYTEK API秘钥]
SPARK_APP_ID=[IFLYTEK API ID]
SPARK_API_VERSION=v2.1

# PostgreSQL数据库
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=uniai

# Redis缓存
REDIS_PORT=6379

# 微信
WX_APP_ID=[微信小程序应用ID]
WX_APP_SECRET=[微信小程序应用密钥]
WX_APP_AUTH_URL=https://api.weixin.qq.com/sns/jscode2session
WX_APP_ACCESS_TOKEN_URL=https://api.weixin.qq.com/cgi-bin/token
WX_APP_PHONE_URL=https://api.weixin.qq.com/wxa/business/getuserphonenumber
WX_APP_MSG_CHECK=https://api.weixin.qq.com/wxa/msg_sec_check

# COS，OSS存储
COS_SECRET_ID=[腾讯COS密钥ID]
COS_SECRET_KEY=[腾讯COS密钥]
COS_BUCKET=[腾讯COS存储桶]
COS_REGION=[腾讯COS地域]

# Google搜索
GOOGLE_SEARCH_API_TOKEN=[Google搜索API令牌]
GOOGLE_SEARCH_ENGINE_ID=[Google搜索引擎ID]

# Stable Diffusion
STABLE_DIFFUSION_API=http://10.144.1.7:3400/sdapi/v1
```

### 安装

我们建议使用 `yarn`而不是 `npm`：

```bash
npm -g install yarn
yarn
```

### 启动数据库

如果您没有矢量数据库（如PostgresSQL pgvector），可以使用Docker和Docker-compose启动一个：

```bash
yarn docker up pgvector
```

### 初始化数据库

```bash
yarn pg init --force
```

## 运行UniAI

### 开发模式

```bash
yarn dev
```

### 生产模式

```bash
yarn tsc
yarn start
```

**⚠️ 在开发模式下不要编译TypeScript文件。如果已经运行了 `tsc`，请在 `yarn dev`之前使用 `yarn clean`。**

### 清理

```bash
yarn clean
```

## 文档

UniAI的API都是通过Web HTTP方法（包括SSE）访问的。

请参阅以下地址的文档：
[https://documenter.getpostman.com/view/9347507/2s93Y5Pf2J](https://documenter.getpostman.com/view/9347507/2s93Y5Pf2J)

## 模型

UniAI将继续集成更多的AI模型并扩展AI工具。但是，UniAI不是一个独立的实体。由于它充当了AI模型、工具和插件的集成和连接点，您需要自己部署您需要的具体模型。我们提供了这些模型的下载URL和指南。

### 自然语言处理模型

- OpenAI GPT: [https://www.npmjs.com/package/openai](https://www.npmjs.com/package/openai)
- GLM/ChatGLM: [https://github.com/uni-openai/GLM-API](https://github.com/uni-openai/GLM-API)

### 计算机视觉模型

- Stable Diffusion: [https://github.com/uni-openai/stable-diffusion-simple](https://github.com/uni-openai/stable-diffusion-simple)

## 未来计划

UniAI将不断发展，提供更多的AI能力，包括以下关键模块：

- 预测API
- 训练API
- 提示API
- 资源API

## 贡献者

我们欢迎您的贡献！

联系devilyouwei <huangyw@iict.ac.cn> 获取更多信息。

_由 [Egg.js](https://www.eggjs.org/) TypeScript 驱动_`<!-- @format -->`
