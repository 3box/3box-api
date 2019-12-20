FROM node:10

WORKDIR /3box-api

COPY package.json package-lock.json ./
RUN npm install

COPY src ./src

EXPOSE  8081

CMD npm run start
