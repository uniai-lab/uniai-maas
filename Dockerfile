FROM node:18

RUN npm install -g yarn

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn --production --frozen-lockfile

COPY . .

RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]
