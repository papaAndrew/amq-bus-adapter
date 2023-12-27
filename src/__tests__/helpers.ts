import { readFileSync } from "fs";
import { ConnectionOptions } from "rhea";
import {
  AmqBusClient,
  AmqBusLogAdapter,
  AmqBusOptions,
  AmqBusServer,
  AmqConnector,
  ConnectorOptions,
} from "../lib/types";

const AMQA_CREDENTIALS = require("./secret/secret.json");

export const CONNECION_OPTIONS: ConnectionOptions = {
  transport: "tls",
  host: "esb-mq01-t",
  port: 50001,
  ca: readFileSync("src/__tests__/secret/ca.cer"),
  ...AMQA_CREDENTIALS,
};
export const OPTIONS: AmqBusOptions = {
  connector: CONNECION_OPTIONS as ConnectorOptions,
  consumer: {
    topic: "AMQADAPTER.TEST.IN",
  },
  producer: {
    topic: "AMQADAPTER.TEST.OUT",
  },
};

export interface CompStack {
  connector: AmqConnector;
  logAdapter: AmqBusLogAdapter;
  server: AmqBusServer;
  client: AmqBusClient;
}

// export function setupStack() {
//   console.log("OPTIONS", OPTIONS);

//   const connector = new AmqpConnector(CONNECION_OPTIONS as ConnectionOptions);
//   const logAdapter = new AmqbLogAdapter();
//   const errorHandler = (err: any) => {throw err};
//   const server = new ConsumerServer(
//     connector,
//     OPTIONS,
//     errorHandler,
//     undefined,
//   ).value();

//   const client = new AmqBusClientProvider(
//     connector,
//     OPTIONS,
//     logAdapter,
//   ).value()

//   const stack: CompStack = {
//     client,
//     connector,
//     logAdapter,
//     server,
//   }
//   return stack;
// }
