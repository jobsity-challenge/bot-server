/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import "module-alias/register";
import { ClusterServer } from "@/vendor/ikoabo/controllers/cluster.controller";
import { ServiceSettings } from "@/settings/service.settings";
import { Logger, LOG_LEVEL } from "@/vendor/ikoabo/controllers/logger.controller";
import { HttpServer } from "@/vendor/ikoabo/controllers/server.controller";
import { AmqpCtrl } from "./controllers/amqp.controller";
import { AuthenticationCtrl } from "./middlewares/authentication.middleware";

/* Initialize cluster server */
const clusterServer = ClusterServer.setup(ServiceSettings);
Logger.setLogLevel(ServiceSettings.SERVICE.LOG);
const _logger: Logger = new Logger("Bot service");

/**
 * Entry point for cluster slave process
 */
function runSlave(server: HttpServer, routes?: any) {
  /* Authenticate agains accounts server */
  AuthenticationCtrl.doLogin()
    .then(() => {
      _logger.debug('Service authenticated');
      /* Initialize service mongo connection */
      server.initMongo().then(() => {
        /* Initialize service express application */
        server.initExpress(ClusterServer.cluster.worker, routes).then(() => {
          /* Start listen the service and socket.io chat server */
          server.listen(null).then(() => {
            /* Initialize AMQP server */
            AmqpCtrl.connect().then(() => {
              AmqpCtrl.listen();
            }).catch(() => {
              process.exit(-1);
            });
          }).catch(() => {
            process.exit(-1);
          });
        }).catch(() => {
          process.exit(-1);
        });
      }).catch(() => {
        process.exit(-1);
      });

    }).catch((err) => {
      _logger.error('There were an authentication error', err);
      process.exit(-1);
    });
}

/* Run cluster with base routes */
clusterServer.run({}, null, runSlave);
