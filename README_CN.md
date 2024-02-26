<!-- @format -->

# <img src="./logo.png" width=23 height=23 /> UniAI

[阅读英文版 (Read this in English)](./README.md)

![框架](./framework.png)

## 概述

UniAI 是一个统一的 API 平台，旨在简化与多种复杂 AI 模型的交互。它集成了多种 AI 模型和工具，以便更轻松地访问和管理。

## 集成模型

UniAI 集成了多个领先的 AI 模型，包括：

-   [OpenAI/GPT](https://platform.openai.com)
-   [IFLYTEK/Spark](https://xinghuo.xfyun.cn)
-   [THUDM/ChatGLM-6B](https://github.com/THUDM/ChatGLM3)
-   [ZHIPU/ChatGLM-Turbo](https://github.com/THUDM/ChatGLM3)
-   [Stable Diffusion](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
-   [OpenAI/DALL-E](https://platform.openai.com)
-   [Midjourney](https://github.com/novicezk/midjourney-proxy)

## 样例

探索 UniAI 的使用案例并体验：

![微信小程序](./miniapp-qrcode.png)

## 系统要求

确保您已安装以下软件：

-   Node.js（版本 16 或更高） - [nvm 安装指南](https://github.com/nvm-sh/nvm)
-   Docker 和 Docker-compose
-   LibreOffice 用于文档转换（libreoffice-convert）
-   pdf-to-img（canvas-node） - [Canvas NPM 包](https://www.npmjs.com/package/canvas)

## 开始使用

### 配置

在根目录创建 `.env` 文件：

```bash
touch ./.env
```

在 `.env` 文件中填写以下环境变量：

```bash
# Application Configuration
ADMIN_TOKEN=                        # Default admin token, can be modified in config table

# OPENAI GPT Configuration
OPENAI_API=http://8.214.93.3        # OpenAI API URL or proxy
OPENAI_API_VERSION=v1               # OpenAI API version (no need to modify)
OPENAI_KEY=                     # OpenAI API key

# GLM Configuration
GLM_API=http://10.144.1.7:8100      # GLM API URL (https://github.com/uni-openai/GLM-API)
GLM_API_REMOTE=https://open.bigmodel.cn     # Remote ZHIPU chatglm API
GLM_API_KEY=                        # ZHIPU AI API key

# IFLYTEK Spark Configuration
SPARK_API=ws://spark-api.xf-yun.com
SPARK_API_KEY=                      # IFLYTEK Spark API KEY
SPARK_API_SECRET=                   # IFLYTEK Spark API Secret
SPARK_APP_ID=                       # IFLYTEK Spark APP ID

# PostgreSQL Database Configuration
DB_DIALECT=postgres
POSTGRES_HOST=localhost             # PostgreSQL host URL
POSTGRES_PORT=5432                  # PostgreSQL port
POSTGRES_USER=postgres              # PostgreSQL user
POSTGRES_PASS=postgres              # PostgreSQL password
POSTGRES_DB=uniai                   # PostgreSQL database name
# For Docker start pgvector
POSTGRES_DATA_PATH=/data/docker/pgvector/data

# Redis Cache Configuration
REDIS_HOST=localhost                # Redis cache host URL
REDIS_PORT=6379                     # Redis cache port
REDIS_PASS=redis
REDIS_DB=0

# WeChat Configuration
WX_APP_ID=                          # WeChat app ID
WX_APP_SECRET=                      # WeChat app secret
WX_APP_AUTH_URL=https://api.weixin.qq.com/sns/jscode2session
WX_APP_ACCESS_TOKEN_URL=https://api.weixin.qq.com/cgi-bin/token
WX_APP_PHONE_URL=https://api.weixin.qq.com/wxa/business/getuserphonenumber
WX_APP_MSG_CHECK=https://api.weixin.qq.com/wxa/msg_sec_check

# MINIO Storage Configuration
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_END_POINT=localhost
MINIO_PORT=9000
MINIO_BUCKET=uniai
# For Docker start Minio
MINIO_DATA_PATH=/data/docker/minio
MINIO_ROOT_USER=root
MINIO_ROOT_PASS=12345678

# Stable Diffusion Configuration
STABLE_DIFFUSION_API=http://10.144.1.7:3400

# Mid Journey Configuration
MJ_API=                    # Visit https://github.com/novicezk/midjourney-proxy
MJ_TOKEN=                  # MidJourney proxy token

```

### 安装步骤

**安装 Node-gyp**

```bash
npm -g install node-gyp
```

**安装 LibreOffice**

-   Ubuntu：`sudo apt install libreoffice`
-   Mac：`brew install libreoffice`

**安装 Node-Canvas 支持**

-   参考：[Canvas NPM 文档](https://www.npmjs.com/package/canvas)
-   根据操作系统安装依赖。

**使用 Yarn（推荐替代 npm）**

```bash
npm -g install yarn
yarn
```

### 启动数据库

如果您没有如 PostgresSQL (pgvector) 等向量数据库，可以使用 Docker 和 Docker-compose 进行设置：

```bash
sudo apt install docker.io docker-compose
```

**数据库服务的 Docker 命令**

-   启动 pgvector：`yarn docker up pgvector`
-   启动 Redis：`yarn docker up redis`
-   启动 Minio（本地 OSS）：`yarn docker up minio`

**重要说明**

-   确保 Docker 卷有正确的权限。
-   在 Docker 初始化 Minio 后进行配置。
-   默认的 Docker 设置在 `.env` 中可找到。

Minio 访问信息：

-   URL：`http://localhost:9000`
-   默认用户名：`root`
-   默认密码：`12345678`

### 运行 UniAI

**开发模式**

-   同时初始化数据库。

```bash
yarn dev
```

**生产模式**

-   编译 TypeScript 文件并启动应用。

```bash
yarn tsc
yarn start
```

⚠️ **重要**：请避免在开发模式下编译 TypeScript 文件。如果之前运行过 `tsc`，请在 `yarn dev` 前使用 `yarn clean`。

### 清理

```bash
yarn clean
```

## 文档

通过常见的 Web HTTP 方法（包括 SSE）访问 UniAI 的 API。详细文档请访问 [UniAI API 文档](https://documenter.getpostman.com/view/9347507/2s93Y5Pf2J

)。

## 可用模型

UniAI 集成了多种 AI 模型，重点关注 NLP 和 CV 领域。特定模型需要独立部署。我们提供了下载链接和指南。

### NLP 模型

-   OpenAI GPT、GLM/ChatGLM、IFLYTEK/SPARK

### CV 模型

-   OpenAI DALL-E、Stable Diffusion、MidJourney

## 未来规划

UniAI 计划在以下关键功能上扩展其 AI 能力：

-   预测 API
-   训练 API
-   提示 API
-   知识库 API

![未来功能](./future.png)

## 贡献

欢迎您的贡献！有关开发信息，请联系 Youwei：<huangyw@iict.ac.cn>。

_基于 [Egg.js](https://www.eggjs.org/) TypeScript 驱动_
