<!-- @format -->

<p align=center>
<img src="./logo.png" width=65 height=65 />
</p>

<h1 align=center>UniAI MaaS</h1>

<p align=center>基于同名node.js库 <a href="https://www.npmjs.com/package/uniai">uniai</a> 开发</p>

<p align=center>
<img src="./framework.jpg" width=100% />
</p>

## 概述

[English Reading](./README.md) 🇺🇸

UniAI MaaS旨在构建一个模型即服务平台，提供多模型的接入，开发者可以直接基于该平台进行AI应用开发。

该项目包含了向量数据库，缓存数据库，文件存储服务等，实现了RAG技术，可以解析上传的Office文件，并存入知识库，在模型输入时进行抽取和注入。

同名node.js库**uniai**是从本项目中剥离出去的nodejs类库，集成了许许多多的模型，你也可以单独使用**uniai**，来自定义你的**MaaS**平台，这样或许更轻量化。为了在你的项目中融入UniAI底座，你可以通过[npm](https://www.npmjs.com/package/uniai) 或者[Github](https://github.com/devilyouwei/UniAI)来安装。

## 集成模型

UniAI集成了多个AI模型，已包括：

-   [科大讯飞/星火大模型](https://xinghuo.xfyun.cn)
-   [THUDM/ChatGLM-6B](https://github.com/THUDM/ChatGLM3)
-   [智谱/GLM](https://github.com/THUDM/ChatGLM3)
-   [月之暗面/moonshot](https://www.moonshot.cn/)
-   [OpenAI/GPT](https://platform.openai.com)
-   [百度/文心一言](https://cloud.baidu.com/product/wenxinworkshop)
-   [Google/Gemini](https://makersuite.google.com/app/)
-   [Stability AI](https://platform.stability.ai/)
-   [OpenAI/DALL-E](https://platform.openai.com)
-   [Midjourney](https://github.com/novicezk/midjourney-proxy)

## 案例

想探索UniAI的使用？请体验以下应用！

### 乐聊小程序版

微信扫码登陆小程序！

<img src="./qrcode.jpg" width=120/>

### 乐聊Pro版本

👍推荐使用我们的专业版：<https://lechat.cas-ll.cn>

-   多模型聊天
-   办公室文件上传和解析
-   图片生成
-   图片识别

![example](https://raw.githubusercontent.com/uni-openai/uniai/main/icon/lechat-pro.png)

## 系统需求

确定你已经安装以下的`NPM`库：

-   Node.js (版本 >= 18) - [nvm Installation Guide](https://github.com/nvm-sh/nvm)
-   Docker & Docker-compose
-   LibreOffice 文档转换版(libreoffice-convert)
-   pdf-to-img (canvas-node) - [Canvas NPM Package](https://www.npmjs.com/package/canvas)

## 开始使用

### 配置

在项目的根目录下创建一个 `.env` 文件：

```bash
touch ./.env
```

填充 `.env` 文件的以下环境变量：

```bash

# 平台默认管理员令牌
ADMIN_TOKEN=

# OPENAI GPT
OPENAI_API= # openai 代理
OPENAI_KEY= # openai 密钥

# Google AI 工作室
GOOGLE_AI_API= # google 代理
GOOGLE_AI_KEY= # google 密钥

# 质普 AI
# ZHIPU_AI_API= #zhipu 代理
ZHIPU_AI_KEY= # zhipu 密钥
GLM_API= # 本地部署的 glm6b

# SPARK
FLY_APP_ID= # 科大讯飞 app id
FLY_API_KEY= # 科大讯飞 api 密钥
FLY_API_SECRET= # 科大讯飞 api secret

# 百度问心研究所
# BAIDU_API=http://192.168.41.52:5300
BAIDU_API_KEY=
BAIDU_SECRET_KEY=

# Moonshot
# MOONSHOT_API=http://192.168.41.52:5400
MOONSHOT_KEY=

# Stable Diffusion
STABLE_DIFFUSION_API=

# Midjourney
MJ_API= # https://github.com/novicezk/midjourney-proxy
MJ_IMG_PROXY= # 代理到 discord cdn 图片
MJ_TOKEN= # mj 令牌

# stability ai
STABILITY_KEY=

# PostgreSQL 数据库
DB_DIALECT=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASS=postgres
POSTGRES_DB=uniai

# Redis 缓存
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=redis
REDIS_DB=0

# 微信
WX_APP_ID= # 微信小程序id
WX_APP_SECRET= # 微信小程序密钥
WX_MCH_ID=
WX_PAY_PRIVATE=
WX_PAY_CERT=
WX_PAY_KEY=

# MINIO 存储
MINIO_END_POINT=localhost
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_PORT=9000
MINIO_BUCKET=uniai

# 极验验证码测试
GEE_TEST_ID=
GEE_TEST_KEY=

# 阿里云 SMS 账号
ALI_KEY_ID=
ALI_KEY_SECRET=
ALI_SMS_TEMPLATE=
ALI_SMS_SIGN=

# 用于启动 Docker 的 pgvector
POSTGRES_DATA_PATH=./data

# 用于启动 Minio 的 Docker
MINIO_DATA_PATH=./data
MINIO_ROOT_USER=root
MINIO_ROOT_PASS=12345678

```

### 安装步骤

**Node-gyp 安装**

```bash
npm -g install node-gyp
```

**LibreOffice 安装**

-   Ubuntu: `sudo apt install libreoffice`
-   Mac: `brew install libreoffice`

**Node-Canvas 支持**

-   参考: [Canvas NPM文档](https://www.npmjs.com/package/canvas)
-   根据你的操作系统安装依赖。

**使用 Yarn (推荐在 npm 之上)**

```bash
npm -g install yarn
yarn
```

**Sharp Support**

```bash
yarn add sharp --ignore-engines
```

### 启动数据库

对于像PostgresSQL (pgvector) 这样的数据库，可以使用 Docker 和 Docker-compose 完成设置：

```bash
sudo apt install docker.io docker-compose
```

**Docker 命令用于数据库服务**

-   开启 pgvector: `yarn docker up pgvector`
-   开启 Redis: `yarn docker up redis`
-   开启 Minio (本地 OSS): `yarn docker up minio`

**重要提示**

-   确保 Docker 卷有适当的权限。
-   Docker 初始化后配置 Minio。
-   默认 Docker 设置在 `.env` 中可用。

Minio 访问:

-   链接: `http://localhost:9000`
-   默认用户名: `root`
-   默认密码: `12345678`

### 运行 UniAI

**开发模式**

-   初始化数据库。

```bash
yarn dev
```

**生产模式**

-   编译 TypeScript 文件并启动应用。

```bash
yarn tsc
yarn start
```

⚠️ **重要**: 避免在开发模式中编译 TypeScript 文件。如果之前运行过 `tsc`，请在 `yarn dev` 之前使用 `yarn clean`。

### 清理

```bash
yarn clean
```

## 文档

通过常见的 Web HTTP 方法访问 UniAI 的 APIs ，包括 SSE。 详细的文档，请访问 [UniAI API 文档](https://documenter.getpostman.com/view/9347507/2s93Y5Pf2J)。

## 可用模型

UniAI 集成了多种 AI 模型，主要关注在 NLP 和 CV 领域。需要独立部署具体的模型，我们提供了下载链接和导引。

### NLP 模型

-   OpenAI GPT, GLM/ChatGLM, IFLYTEK/SPARK

### CV 模型

-   OpenAI DALL-E, Stable Diffusion, MidJourney

## 未来增强

UniAI计划扩展其能力到：

-   预测 API
-   训练 API
-   提示 API
-   资源管理 API

![未来特点](./future.png)

## 贡献

黄有为 <huangyw@iict.ac.cn>

中科苏州智能计算技术研究院

## 许可

基于 [Egg.js](https://www.eggjs.org/)
<img src="https://static-production.npmjs.com/255a118f56f5346b97e56325a1217a16.svg" height="15px"/>

[MIT](./LICENSE)

版权所有 © 2022至今, 中科苏州智能计算技术研究院
