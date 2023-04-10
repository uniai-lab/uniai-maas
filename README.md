<!-- @format -->

# Model as a Service

Create the applications with AI models, GPT-like models, or OpenAI APIs!

This is just a backend template of AI apps.

_Powered by [Egg.js](https://www.eggjs.org/) TypeScript_

![framework](./framework.png)

## Prepare

Download Node.js (Version>=18)

Install `docker` and `docker-compose`

Create an `.env` file in the root path of this repo:

```bash
touch ./.env
```

Fill the following environment params:

```bash
URL=[Your App Domain]

OPENAI_PROXY=[Your OpenAI proxy]
OPENAI_API_KEY=[Your OpneAI API key]
OPENAI_EMBED_DIM=1536

SAVE_DOC_PATH=app/public/docs
SAVE_MODEL_PATH=app/public/models
MILVUS_ADDR=localhost:19530

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=openai

WX_APP_ID=[Your Wechat MiniApp app id]
WX_APP_SECRET=[Your Wechat MiniApp app secret]
WX_APP_AUTH_URL=https://api.weixin.qq.com/sns/jscode2session
WX_APP_ACCESS_TOKEN_URL=https://api.weixin.qq.com/cgi-bin/token
WX_APP_PHONE_URL=https://api.weixin.qq.com/wxa/business/getuserphonenumber
WX_APP_MSG_CHECK=https://api.weixin.qq.com/wxa/msg_sec_check

DEFAULT_AVATAR_AI=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-ai.png
DEFAULT_AVATAR_USER=https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-user.png
DEFAULT_USERNAME=Reader

COS_SECRET_ID=[Your Tencent COS service secret id]
COS_SECRET_KEY=[Your Tencent COS service secret key]
COS_BUCKET=[Your Tencent COS service bucket]
COS_REGION=[Your Tencent COS service region]

ADMIN_TOKEN=ReadingZhiDuJUN2023!
```

**Install libs**

```bash
npm -g install yarn
yarn
```

If you don't have a vector database, e.g. milvus, PostgresSQL (pgvector), run:

```bash
yarn docker up pgvector
```

**Init database**

```bash
yarn pg init --force
```

Init database config table

```bash
yarn pg config
```

**Init database resource-type table**

```bash
yarn pg resource-type
```

**Init database sensitive word table**

```bash
yarn pg sensitive
```

**Add Guidebook**

URL: https://localhost:3000/admin/add-resource

Params:

1. file
1. resourceTypeId = 1
1. token

In this API, `userId = 0`

## Run

In development mode:

```bash
yarn dev
```

Don't tsc compile at development mode, if you had run `tsc` then you need to `yarn clean` before `yarn dev`.

## Deploy

```bash
yarn tsc
yarn start
```

## Script Operation

-   Use `npm run lint` to check code style
-   Use `npm test` to run unit test
-   se `npm run clean` to clean compiled js at development mode once

### Milvus Database Operation

To operate the database in command line, such as shell/bash, use the following npm scripts:

```bash
# init collections
yarn milvus init

# show all collections
yarn milvus collections

# load collection (before query, you need to load first)
yarn milvus load [collection-name]

# release collection
yarn milvus release [collection-name]

# query by id
yarn milvus query [collection-name] [id]
```

## Requirement

-   Node.js >= 18.x
-   Typescript >= 4.x
-   Docker
-   Docker-compose
