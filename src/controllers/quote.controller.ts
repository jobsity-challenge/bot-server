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
import request from 'request';
import { parse as CsvParser } from 'csv-string';

/**
 * Quote controller
 */
class Quote {
  private static _instance: Quote;
  private _logger: Logger;

  /**
   * Allow singleton class instance
   */
  private constructor() {
    this._logger = new Logger('Quote');
  }

  /**
   * Get singleton class instance
   */
  public static get shared(): Quote {
    if (!Quote._instance) {
      Quote._instance = new Quote();
    }
    return Quote._instance;
  }

  public doQuote(param: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {

      /* Request the quote to server */
      request.get(`https://stooq.com/q/l/?s=${param}&f=sd2t2ohlcv&h&e=csv`, {},
        (error: any, response: request.Response, body: any) => {
          if (error) {
            this._logger.error(
              "Invalid authentication server response ",
              error
            );
            return reject({ error: 'Invalid quote server response' });
          }

          try {
            /* Try to convert response body to JSON */
            const arr = CsvParser(body);
            if (arr.length == 2) {
              return resolve(arr[1]);
            }

            return reject({ error: 'There is an error on data format' });
          } catch (err) {
            return reject({ error: 'There is an error on data format' });
          }
        }
      );
    });
  }
}

export const QuoteCtrl = Quote.shared;
