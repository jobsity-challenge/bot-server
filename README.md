# Chat Bot Server

Chat Bot Server is an small microservice developed to receive message commands fro Rabbitmq server and return message to chat server.

Currently the microservice support to commands:

- /stock=stock_code
- /hello=name

## Installation of the service

- Clone the repository

```
git clone https://gitlab.com/jobsity1/challenge/bot-server.git
```

- Install dependencies

```
cd bot-server
npm install
```

- Build the project

```
npm run build
```

## Running the service

The service can be runned directly from the command line with:

```bash
npm start
```

or it can be build and runned watching for file changes

```
npm run dev
```

To run the service there are some environment variables that can be used to configure it:

- `LOG`: Set the vebose level of the service debugger, allowed values are: error, warn, info, http, verbose, debug, silly (Default: debug)
- `PORT`: Set the running port for the HTTP server (Default: 3000)
- `INTERFACE`: Set the HTTP server listening interface (Default: 127.0.0.1)
- `ENV`: Set the service running mode, allowd values are: dev, production (Default: dev)
- `INSTANCES`: Set the number o workers runing into the cluster (Default: 1)
- `MONGODB_URI`: Set the MongoDB database connection URI (Default: mongodb://127.0.0.1:27017/chat_srv)
- `AUTH_SERVER`: Set the base URL to call for accounts validation (Default: https://accounts.jobsity.ikoabo.com)
- `AUTH_USERNAME`: Account username to authenticate the bot
- `AUTH_PASSWORD`: Account password to authenticate the bot
- `AMQP_PROTOCOL`: Rabbitmq server protocol (Default: amqp)
- `AMQP_SERVER`: Rabbitmq server address (Default: 127.0.0.1)
- `AMQP_PORT`: Rabbitmq server port (Default: 5672)
- `AMQP_USERNAME`: Rabbitmq server username to authenticate (Default: guest)
- `AMQP_PASSWORD`: Rabbitmq server password to authenticate (Default: guest)
- `AMQP_QUEUE`: Rabbitmq queue to receive message notifications from bots (Default: bot-jobsity-chat)
- `AMQP_BOT_QUEUE_BOT`: Rabbitmq queue to send command requests to bots (Default: bot-jobsity-bot)

## Deploy on server

### Run as service

To allow the microservice to run as system service, first you must install `pm2`:

```
npm i -g pm2
```

After that, you must create the ecosystem file to launch the service:

```
nano ecosystem.config.js
```

The `ecosystem.config.js` file contains the following lines:

```
module.exports = {
  apps : [{
    name: 'BOT-JOBSITY',
    script: 'dist/index.js',
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'development',
      ENV: 'dev',
      PORT: 8003,
      INSTANCES: 2,
      LOG: 'debug',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/srv_bot',
      AUTH_SERVER: 'https://accounts.jobsity,ikoabo.com',
      AUTH_USERNAME: 'bot@challenge.com',
      AUTH_PASSWORD: 'challenge*2020',
      AMQP_PROTOCOL: 'amqp',
      AMQP_SERVER: '127.0.0.1',
      AMQP_PORT: 5672,
      AMQP_USERNAME: 'challenge',
      AMQP_PASSWORD: 'challenge*2020',
      AMQP_QUEUE: 'bot-jobsity-chat',
      AMQP_BOT_QUEUE_BOT: 'bot-jobsity-bot'
    },
  }],
};

```

To start the service run the folowing lines:

```
pm2 start ecosystem.config.js
pm2 save
```

Now the accounts microservice is running as system service.
