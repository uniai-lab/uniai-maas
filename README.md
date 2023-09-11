<!-- @format -->

# <img src="./logo.png" width=31 height=31 /> UniAI

[简体中文版](./README_CN.md)

![Framework](./framework.png)

## Integrated Models

- [OpenAI GPT](https://platform.openai.com/)
- [OpenAI DALL-E](https://platform.openai.com/)
- [THUDM GLM](https://github.com/THUDM/ChatGLM-6B)
- [Stable Diffusion](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
- [IFLYTEK Spark](https://xinghuo.xfyun.cn/)

## Samples

Who are using UniAI and where can I experience it?

![wechat miniapps](./miniapp-qrcode.png)

_Notice: All of the above mini app samples depend on GLM model by UniAI!_

## About UniAI

UniAI is designed to simplify your interactions with mutiple and complex AI models.

We aim to provide an API-based platform that integrates various AI models and utilities.

## Requirements

Before you start, make sure you have:

- Node.js >= 18.x
- TypeScript >= 4.x
- Docker
- Docker-compose

## Getting Started

### Configuration

1. Create a `.env` file at the root directory:

```bash
touch ./.env
```

2. Fill in the environment parameters in the `.env` file as follows:

```bash
# APP
APP_NAME=UniAI
APP_URL=https://www.uniai.us
DEFAULT_AVATAR_AI=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-lechat.png
DEFAULT_AVATAR_USER=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-user.png
DEFAULT_USERNAME=AI
ADMIN_TOKEN=[Your Admin Token]

# GPT
OPENAI_API=[Your OpenAI proxy URL]
OPENAI_API_KEY=[Your OpenAI key]
OPENAI_EMBED_DIM=1536

# GLM
GLM_API=[Your ChatGLM model API URL]
GLM_EMBED_DIM=1024

# IFLYTEK
SPARK_API=ws://spark-api.xf-yun.com
SPARK_API_KEY=[IFLYTEK API key]
SPARK_API_SECRET=[IFLYTEK API secret]
SPARK_APP_ID=[IFLYTEK API ID]
SPARK_API_VERSION=v2.1

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

### Installation

We recommend using `yarn` instead of `npm`:

```bash
npm -g install yarn
yarn
```

### Start Database

If you don't have a vector database such as PostgresSQL (pgvector), you can start one using Docker and Docker-compose:

```bash
yarn docker up pgvector
```

### Initialize Database

```bash
yarn pg init --force
```

## Running UniAI

### Development Mode

```bash
yarn dev
```

### Production Mode

```bash
yarn tsc
yarn start
```

**⚠️ Do not compile TypeScript files in development mode. If you have run `tsc`, use `yarn clean` before `yarn dev`.**

### Cleaning Up

```bash
yarn clean
```

## Documentation

UniAI's APIs are all accessed through Web HTTP methods including SSE.

Please refer to the documentation at the following address:
[https://documenter.getpostman.com/view/9347507/2s93Y5Pf2J](https://documenter.getpostman.com/view/9347507/2s93Y5Pf2J)

## Models

UniAI continues to integrate more AI models and extend AI utilities. However, UniAI is not a standalone entity. Since it serves as an integration and connection point for AI models, tools, and plugins, you'll need to deploy specific models you require on your own. We provide download URLs and guides for these models.

### NLP Models

- OpenAI GPT: [https://www.npmjs.com/package/openai](https://www.npmjs.com/package/openai)
- GLM/ChatGLM: [https://github.com/uni-openai/GLM-API](https://github.com/uni-openai/GLM-API)

### CV Models

- Stable Diffusion: [https://github.com/uni-openai/stable-diffusion-simple](https://github.com/uni-openai/stable-diffusion-simple)

## Future Plans

UniAI will evolve to offer more AI capabilities across the following key modules:

- Prediction APIs
- Training APIs
- Prompting APIs
- Resource APIs

## Contributors

We welcome your contributions!

Reach out to devilyouwei <huangyw@iict.ac.cn> for more information.

_Powered by [Egg.js](https://www.eggjs.org/) TypeScript_
