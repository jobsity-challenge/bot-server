/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */

import { Logger } from "@/vendor/ikoabo/controllers/logger.controller";
import amqp from "amqplib/callback_api";
import { ServiceSettings } from "@/settings/service.settings";
import { AuthenticationCtrl } from "@/middlewares/authentication.middleware";
import { QuoteCtrl } from "./quote.controller";

/**
 * Rabbitmq Amqp controller
 */
class Amqp {
  private static _instance: Amqp;
  private _logger: Logger;
  private _amqpConn: amqp.Connection;
  private _amqpChannel: amqp.Channel;

  /**
   * Allow singleton class instance
   */
  private constructor() {
    this._logger = new Logger('Amqp');
  }

  /**
   * Get the singleton class instance
   */
  public static get shared(): Amqp {
    if (!Amqp._instance) {
      Amqp._instance = new Amqp();
    }
    return Amqp._instance;
  }

  /**
   * Connect to AMQP server
   */
  public connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._logger.debug('Connecting to AMQP server', ServiceSettings.AMQP);

      /* Check if the server seems to be connected */
      if (this._amqpConn || this._amqpChannel) {
        /* Disconnect from old server */
        this.disconnect();
      }

      /* Connect to the amqp Rabbitmq server */
      amqp.connect({
        protocol: ServiceSettings.AMQP.PROTOCOL,
        hostname: ServiceSettings.AMQP.SERVER,
        port: ServiceSettings.AMQP.PORT,
        username: ServiceSettings.AMQP.USERNAME,
        password: ServiceSettings.AMQP.PASSWORD,
      }, {}, (err: any, conn: amqp.Connection) => {
        if (err) {
          this._logger.error('There were some error connecting to Rabbitmq wity amqp library', err);
          return reject();
        }

        /* Create the channel */
        this._amqpConn = conn;
        conn.createChannel((err: any, channel: amqp.Channel) => {
          if (err) {
            this._logger.error('There were some error connecting to Rabbitmq wity amqp library', err);
            return reject();
          }

          this._amqpChannel = channel;
          channel.assertQueue(ServiceSettings.AMQP.QUEUE, { durable: false }, (err: any) => {
            if (err) {
              this._logger.error('There were some error checking the queue', err);
              return reject();
            }
            resolve();
          });
        })
      });
    });
  }

  /**
   * Listen for message notification
   */
  public listen() {
    this._logger.debug('Waiting AMQP messages', { queue: ServiceSettings.AMQP.QUEUE });
    this._amqpChannel.consume(ServiceSettings.AMQP.BOT_QUEUE, function (msg) {
      try {
        /* Parse the bot message */
        const messageResponse: any = JSON.parse(msg.content.toString());
        this._logger.debug('Processing Bot messages', messageResponse);
        /* Validate the message user */
        AuthenticationCtrl.authenticate(messageResponse.token, ['user'])
          .then(() => {

            /* Apply regular expression to match commands /<command>=<parameter> */
            const regex = messageResponse.message.toString().match(/^\/([a-zA-z0-9\.\-_]+)=([a-zA-z0-9\.\-_]+)$/);

            /* Check if command its matched successfull */
            if (!regex || regex.length !== 3) {
              AmqpCtrl.send({
                message: 'Invalid command format. The right sintax is: /<command>=<parameter> the allowed commands are `stock` and `hello`',
                chatroom: messageResponse.chatroom,
                token: AuthenticationCtrl.token,
                error: true,
              });
              return;
            }

            switch (regex[1]) {
              case 'stock':
                QuoteCtrl.doQuote(regex[2])
                  .then((quotes: string[]) => {
                    AmqpCtrl.send({
                      message: `${regex[2].toString().toUpperCase()} quote is $ ${quotes[3]} per share`,
                      chatroom: messageResponse.chatroom,
                      token: AuthenticationCtrl.token,
                    });
                  }).catch((err: any) => {
                    AmqpCtrl.send({
                      message: err.error || 'Unknown error',
                      chatroom: messageResponse.chatroom,
                      token: AuthenticationCtrl.token,
                      error: true,
                    });
                  });

                break;
              case 'hello':
                AmqpCtrl.send({
                  message: `Hello ${regex[2]}, have a nice day`,
                  chatroom: messageResponse.chatroom,
                  token: AuthenticationCtrl.token,
                });
                break;
              default:
                AmqpCtrl.send({
                  message: 'Invalid command format. The right sintax is: /<command>=<parameter> the allowed commands are `stock` and `hello`',
                  chatroom: messageResponse.chatroom,
                  token: AuthenticationCtrl.token,
                  error: true,
                });
            }
          }).catch((err) => {
            this._logger.error('Invalid bot credentials', {
              message: messageResponse,
              error: err
            });
          });
      } catch (err) {
        this._logger.error('Invalid message from AMQP', {
          message: msg,
          error: err,
        });
      }
    }, { noAck: true });
  }

  /**
   * 
   * @param msg Send message to the bot queue
   */
  public send(msg: any) {
    this._logger.debug('Send AMQP messages', { queue: ServiceSettings.AMQP.QUEUE, message: msg });

    /* Send the message to the queue */
    if (!this._amqpChannel.sendToQueue(ServiceSettings.AMQP.QUEUE, Buffer.from(JSON.stringify(msg)), { persistent: false })) {
      this._logger.error('There were error sending the message');
    }
  }

  /**
   * Disconnect from AMQP server
   */
  public disconnect() {
    this._logger.debug('Disconnecting from AMQP server');

    /* Check if channel is valid */
    if (!this._amqpChannel) {

      /* Check if connection is valid */
      if (!this._amqpConn) {
        return;
      }

      /* Close the connection */
      this._amqpConn.close((err) => {
        if (err) {
          this._logger.error('There were error closing the active connection', err);
        }
        this._amqpConn = null;
      });
      return;
    }

    /* Close the channel */
    this._amqpChannel.close((err) => {
      if (err) {
        this._logger.error('There were error closing the active channel', err);
      }
      this._amqpChannel = null;

      /* Check if the connection is valid */
      if (!this._amqpConn) {
        return;
      }

      /* Close the connection */
      this._amqpConn.close((err) => {
        if (err) {
          this._logger.error('There were error closing the active connection', err);
        }
        this._amqpConn = null;
      });
    });
  }
}
export const AmqpCtrl = Amqp.shared;
