import { describe } from "@jest/globals";
import { AmqpConnector } from "../lib/amqp-connector";
import { AmqConnector } from "../lib/types";
import { CONNECION_OPTIONS } from "./helpers";

const TOPIC_SENDER = "AMQADAPTER.TEST.OUT";

describe("AmqConnector", () => {
  let connector: AmqConnector;

  beforeAll(() => {
    connector = new AmqpConnector(CONNECION_OPTIONS);
  });

  afterAll(() => {
    connector.disconnect();
  });

  it("AmqConnector connect and diconnect", async () => {
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

  it("AmqConnector create Sender with topic", async () => {
    await connector.connect();
    const sender = connector.createSender(TOPIC_SENDER);
    // console.log("sender.options", sender.options);

    expect(sender.options["target"].address).toBe(TOPIC_SENDER);
  });

  it("AmqConnector create Receiver with topic", async () => {
    await connector.connect();

    const receiver = connector.createReceiver(TOPIC_SENDER);
    // console.log("receiver.options", receiver.options);

    expect(receiver.options["source"].address).toBe(TOPIC_SENDER);
  });
});
