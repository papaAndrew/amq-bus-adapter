import { readFileSync } from "fs";
import { ConnectionOptions } from "rhea";
import { AmqBusOptions, ConnectorOptions } from "../lib/types";

const AMQA_CREDENTIALS = require("./secret/secret.json");

export const CONNECION_OPTIONS: ConnectionOptions = {
  transport: "tls",
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
