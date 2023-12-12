<!-- @format -->

# <img src="./logo.png" width=23 height=23 /> UniAI

[Read this in Simplified Chinese (简体中文说明)](./README_CN.md)

![Framework](./framework.png)

## Overview

UniAI, a unified API-based platform, streamlines interactions with diverse and complex AI models. It integrates a range of AI models and utilities to facilitate easier access and management.

## Integrated Models

UniAI integrates several leading AI models, including:

-   [OpenAI/GPT](https://platform.openai.com)
-   [IFLYTEK/Spark](https://xinghuo.xfyun.cn)
-   [THUDM/ChatGLM-6B](https://github.com/THUDM/ChatGLM3)
-   [ZHIPU/ChatGLM-Turbo](https://github.com/THUDM/ChatGLM3)
-   [Stable Diffusion](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
-   [OpenAI/DALL-E](https://platform.openai.com)
-   [Midjourney](https://github.com/novicezk/midjourney-proxy)

## Samples

Discover how UniAI is utilized and experience it firsthand:

![wechat miniapps](./miniapp-qrcode.png)

## System Requirements

Ensure you have the following installed:

-   Node.js (version 16 or higher) - [nvm Installation Guide](https://github.com/nvm-sh/nvm)
-   Docker & Docker-compose
-   LibreOffice for document conversion (libreoffice-convert)
-   pdf-to-img (canvas-node) - [Canvas NPM Package](https://www.npmjs.com/package/canvas)

## Getting Started

### Configuration

Create an `.env` file at the root directory:

```bash
touch ./.env
```

Populate the `.env` file with the following environment variables:

```bash

# Application Configuration
ADMIN_TOKEN= # Default admin token, can be modified in config table

# OPENAI GPT Configuration

OPENAI_API=http://8.214.93.3 # OpenAI API URL or proxy
OPENAI_API_VERSION=v1 # OpenAI API version (no need to modify)
OPENAI_API_KEY= # OpenAI API key

# GLM Configuration

GLM_API=http://10.144.1.7:8100 # GLM API URL (https://github.com/uni-openai/GLM-API)
GLM_API_REMOTE=https://open.bigmodel.cn # Remote ZHIPU chatglm API
GLM_API_KEY= # ZHIPU AI API key

# IFLYTEK Spark Configuration

SPARK_API=ws://spark-api.xf-yun.com
SPARK_API_KEY= # IFLYTEK Spark API KEY
SPARK_API_SECRET= # IFLYTEK Spark API Secret
SPARK_APP_ID= # IFLYTEK Spark APP ID

# PostgreSQL Database Configuration

DB_DIALECT=postgres
POSTGRES_HOST=localhost # PostgreSQL host URL
POSTGRES_PORT=5432 # PostgreSQL port
POSTGRES_USER=postgres # PostgreSQL user
POSTGRES_PASS=postgres # PostgreSQL password
POSTGRES_DB=uniai # PostgreSQL database name

# For Docker start pgvector

POSTGRES_DATA_PATH=/data/docker/pgvector/data

# Redis Cache Configuration

REDIS_HOST=localhost # Redis cache host URL
REDIS_PORT=6379 # Redis cache port
REDIS_PASS=redis
REDIS_DB=0

# WeChat Configuration

WX_APP_ID= # WeChat app ID
WX_APP_SECRET= # WeChat app secret
WX_APP_AUTH_URL=https://api.weixin.qq.com/sns/jscode2session
WX_APP_ACCESS_TOKEN_URL=https://api.weixin.qq.com/cgi-bin/token
WX_APP_PHONE_URL=https://api.weixin.qq.com/wxa/business/getuserphonenumber
WX_APP_MSG_CHECK=https://api.weixin.qq.com/wxa/msg_sec_check

# MINIO Storage Configuration

OSS_TYPE=minio
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_END_POINT=localhost
MINIO_PORT=9000
MINIO_BUCKET=uniai

# For Docker start Minio

MINIO_DATA_PATH=/data/docker/minio
MINIO_ROOT_USER=root
MINIO_ROOT_PASS=12345678

# Google Search Configuration

GOOGLE_SEARCH_API_TOKEN=
GOOGLE_SEARCH_ENGINE_ID=

# Stable Diffusion Configuration

STABLE_DIFFUSION_API=http://10.144.1.7:3400

# Mid Journey Configuration

MID_JOURNEY_API= # Visit https://github.com/novicezk/midjourney-proxy
MID_JOURNEY_TOKEN= # MidJourney proxy token

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

Contributions are welcome! For development-related queries, contact Youwei at <huangyw@iict.ac.cn>.

_Powered by [Egg.js](https://www.eggjs.org/) TypeScript_
