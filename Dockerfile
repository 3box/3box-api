FROM node:10
WORKDIR /3box-api
COPY package.json /3box-api/package.json
ADD  package-lock.json /3box-api/package-lock.json
RUN npm install
COPY src /3box-api/src
EXPOSE  8081
CMD npm run start
