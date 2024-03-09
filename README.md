<!-- @format -->

<p align=center>
<img src="./logo.png" width=100 height=100 />
</p>

<h1 align=center>UniAI MaaS Platform </h1>

<p align=center>Powered by the eponymous node.js library <a href="https://www.npmjs.com/package/uniai">uniai</a></p>

<p align=center>
<img src="./framework.png" width=100% />
</p>

## Overview

[Read this in Simplified Chinese (简体中文说明)](./README_CN.md) 🇨🇳

UniAI is a unified model as a service platform, making streamlines interactions with diverse AI models.

UniAI integrates a range of AI models and utilities to facilitate easier access and management.

UniAI is powered by the same-name nodejs library [npm](https://www.npmjs.com/package/uniai), [github](https://github.com/devilyouwei/UniAI).

## Integrated Models

UniAI integrates multiple AI models, including:

-   [IFLYTEK/Spark](https://xinghuo.xfyun.cn)
-   [THUDM/ChatGLM-6B](https://github.com/THUDM/ChatGLM3)
-   [ZHIPU/ChatGLM-Turbo](https://github.com/THUDM/ChatGLM3)
-   [OpenAI/GPT](https://platform.openai.com)
-   [Baidu/wenxin workshop](https://cloud.baidu.com/product/wenxinworkshop)
-   [Google/wenxin workshop](https://makersuite.google.com/app/)
-   [Stable Diffusion](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
-   [OpenAI/DALL-E](https://platform.openai.com)
-   [Midjourney](https://github.com/novicezk/midjourney-proxy)

## Samples

Discover how UniAI is utilized and experience it firsthand:

![wechat miniapps](./miniapp-qrcode.png)

## System Requirements

Ensure you have the following `NPM` libs installed:

-   Node.js (version 18 or higher) - [nvm Installation Guide](https://github.com/nvm-sh/nvm)
-   Docker & Docker-compose
-   LibreOffice for document conversion (libreoffice-convert)
-   pdf-to-img (canvas-node) - [Canvas NPM Package](https://www.npmjs.com/package/canvas)
-   libvips (sharp) - [https://www.npmjs.com/package/sharp]

## Getting Started

### Configuration

Create an `.env` file at the project root path:

```bash
touch ./.env
```

Fill the `.env` file with the following environment variables:

```bash

# Platform default admin token
ADMIN_TOKEN=????

# OPENAI GPT
OPENAI_API= # openai proxy
OPENAI_KEY= # openai key

# Google AI studio
GOOGLE_AI_KEY= # google key
GOOGLE_AI_API= # google proxy

# ZHIPU AI
# ZHIPU_AI_API= #zhipu proxy
ZHIPU_AI_KEY= # zhipu key
GLM_API= # local deployed glm

# SPARK
FLY_APP_ID= # iflytek app id
FLY_API_KEY= # ilfytek api key
FLY_API_SECRET= # iflytek api secret

# baidu wenxin workshop
# BAIDU_API=http://192.168.41.52:5300
BAIDU_API_KEY=
BAIDU_SECRET_KEY=

# Moonshot
# MOONSHOT_API=http://192.168.41.52:5400
MOONSHOT_KEY=

# Stable Diffusion
STABLE_DIFFUSION_API=

# Midjourney
MJ_API=
MJ_TOKEN=

# other models, local deployed models, opensource models
OTHER_API=

# PostgreSQL database
DB_DIALECT=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASS=postgres
POSTGRES_DB=uniai

# Redis cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=redis
REDIS_DB=0

# WeChat
WX_APP_ID= # wechat miniapp id
WX_APP_SECRET= # wechat miniapp secret

# MINIO storage
MINIO_END_POINT=localhost
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_PORT=9000
MINIO_BUCKET=uniai

# For Docker start pgvector
POSTGRES_DATA_PATH=./data

# For Docker start Minio
MINIO_DATA_PATH=./data
MINIO_ROOT_USER=root
MINIO_ROOT_PASS=12345678

# gee code test
GEE_TEST_ID=
GEE_TEST_KEY=

# aliyun SMS account
ALI_KEY_ID=
ALI_KEY_SECRET=
ALI_SMS_TEMPLATE=
ALI_SMS_SIGN=

```

### Installation Steps

**Node-gyp Installation**

```bash
npm -g install node-gyp
```

**LibreOffice Installation**

-   Ubuntu: `sudo apt install libreoffice`
-   Mac: `brew install libreoffice`

**Node-Canvas Support**

-   Reference: [Canvas NPM Documentation](https://www.npmjs.com/package/canvas)
-   Install dependencies as per your operating system.

**Sharp Support**

- Ubuntu: `sudo apt install libvips`
- Mac: `brew install libvips`

**Using Yarn (Recommended over npm)**

```bash
npm -g install yarn
yarn
```

### Starting the Database

For databases like PostgresSQL (pgvector), Docker and Docker-compose can be used for setup:

```bash
sudo apt install docker.io docker-compose
```

**Docker Commands for Database Services**

-   Start pgvector: `yarn docker up pgvector`
-   Start Redis: `yarn docker up redis`
-   Start Minio (local OSS): `yarn docker up minio`

**Important Notes**

-   Ensure proper permissions for Docker volumes.
-   Configure Minio after Docker initialization.
-   Default Docker settings are available in `.env`.

Minio Access:

-   URL: `http://localhost:9000`
-   Default Username: `root`
-   Default Password: `12345678`

### Running UniAI

**Development Mode**

-   Initializes the database.

```bash
yarn dev
```

**Production Mode**

-   Compile TypeScript files and start the application.

```bash
yarn tsc
yarn start
```

⚠️ **Important**: Avoid compiling TypeScript files in development mode. Use `yarn clean` before `yarn dev` if `tsc` was previously run.

### Cleaning Up

```bash
yarn clean
```

## Documentation

Access UniAI's APIs through common Web HTTP methods, including SSE. For detailed documentation, visit [UniAI API Documentation](https://documenter.getpostman.com/view/9347507/2s93Y5Pf2J).

## Available Models

UniAI integrates various AI models, focusing on NLP and CV domains. Specific models need to be deployed independently. Download URLs and guides are provided.

### NLP Models

-   OpenAI GPT, GLM/ChatGLM, IFLYTEK/SPARK

### CV Models

-   OpenAI DALL-E, Stable Diffusion, MidJourney

## Future Enhancements

UniAI is planning to expand its capabilities across:

-   Prediction APIs
-   Training APIs
-   Prompting APIs
-   Resource Management APIs

![future features](./future.png)

## Contributing

Youwei Huang <huangyw@iict.ac.cn>

## License

Powered by [Egg.js](https://www.eggjs.org/)
<img src="https://static-production.npmjs.com/255a118f56f5346b97e56325a1217a16.svg" height="20px"/>

[MIT](./LICENSE)

Copyright (c) 2022-present, Youwei Huang
