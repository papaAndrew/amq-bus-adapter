import { describe } from "@jest/globals";
import { readFileSync } from "fs";
import { ConnectionOptions } from "rhea";
import { getConnectionDetails } from "..";
import { AmqpConnector } from "../lib/amqp-connector";
import { AmqConnector } from "../lib/types";

// const brokers = "esb-dev02-t:5671,esb-dev01-t:5672";
const brokers = "app-smx01-t2:62617";

let CONNECT_OPTIONS: ConnectionOptions = {
  port: undefined,
  username: "amqp",
  password: "amqp",
  connection_details: getConnectionDetails(brokers, { transport: "tls" }),
  reconnect: true,
  initial_reconnect_delay: 500,
  max_reconnect_delay: 1000,
  reconnect_limit: 2,
  ca: readFileSync("src/__tests__/secret/ca.cer"),
};

describe("AmqConnector reconnect", () => {
  let connector: AmqConnector;

  beforeAll(() => {
    console.log("CONNECT_OPTIONS", CONNECT_OPTIONS);

    connector = new AmqpConnector(CONNECT_OPTIONS);
  });

  afterAll(async () => {
    await connector.disconnect();
  });

  it("AmqConnector connect with brokers list", async () => {
    await connector
      .connect()
      .then(() => {
        expect(connector.isConnected()).toBe(true);
      })
      .then(() => {
        connector.disconnect();
        expect(connector.isConnected()).toBe(false);
      })
      .catch((err) => console.log("Exception:", err.message));
  });

  /**
   * That does not work
   */
  it.skip("AmqConnector connection failure (does not work)", async () => {
    (CONNECT_OPTIONS.connection_details = getConnectionDetails(
      "fakehost1:0000,fakehost2:0000",
    )),
      await connector
        .connect()
        .then(() => {
          expect(connector.isConnected()).toBe(false);
        })
        .catch((err) => {
          expect(connector.isConnected()).toBe(false);
          console.log("Exception", err);
        });
  });
});
