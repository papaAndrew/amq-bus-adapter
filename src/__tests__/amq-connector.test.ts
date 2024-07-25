import { describe } from "@jest/globals";
import { ConnectionOptions } from "rhea";
import { AmqpConnector } from "../lib/amqp-connector";
import { AmqConnector } from "../lib/types";

const TOPIC_SENDER = "AMQADAPTER.TEST.OUT";

const CONNECTION_OPTIONS: ConnectionOptions = {
  host: "esb-dev01-t",
  port: 5672,
  username: "amqp",
  password: "amqp",
};

describe("AmqConnector", () => {
  let connector: AmqConnector;

  beforeAll(async () => {
    // console.log("CONNECTION_OPTIONS", CONNECTION_OPTIONS);
    connector = new AmqpConnector(CONNECTION_OPTIONS);
    await connector.connect();
  });

  beforeEach(async () => {
    await connector.connect();
  });
  afterEach(async () => {
    await connector.disconnect();
  });
  // afterAll(async () => {
  //   await connector.disconnect();
  // });

  it("AmqConnector connect and disconnect", async () => {
    expect(connector.isConnected()).toBeTruthy();
    await connector.disconnect();
    expect(connector.isConnected()).toBeFalsy();
  });

  it("AmqConnector create Sender with topic", async () => {
    const sender = connector.createSender(TOPIC_SENDER);
    // console.log("sender.options", sender.options);

    expect(sender.options["target"].address).toBe(TOPIC_SENDER);
  });

  it("AmqConnector create Receiver with topic", async () => {
    const receiver = connector.createReceiver(TOPIC_SENDER);

    expect(receiver.options["source"].address).toBe(TOPIC_SENDER);
  });
});
