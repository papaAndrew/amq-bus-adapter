import { describe } from "@jest/globals";
import { Message } from "rhea";
import { AmqbLogAdapter } from "../lib/amqb-log-adapter";
import { AmqpConnector } from "../lib/amqp-connector";
import { ConsumerServer } from "../lib/consumer-server";
import { ProducerClient } from "../lib/producer-client";
import { waitFor } from "../lib/tools";
import { AmqConnector, ConsumerOptions, ProduceMsgStatus } from "../lib/types";
import { CONNECION_OPTIONS } from "./helpers";
// import {AMQA_CREDENTIALS} from './secret';

const TOPIC = "AMQADAPTER.TEST.IN";

describe("ConsumerServer", () => {
  let connector: AmqConnector;
  let client: ProducerClient;

  beforeAll(async () => {
    connector = new AmqpConnector(CONNECION_OPTIONS);
    await connector.connect();
    client = new ProducerClient(new AmqbLogAdapter(), connector);
  });

  afterAll(() => {
    connector.disconnect();
  });

  it("Receive any message", async () => {
    const body = "Receive any message";
    const ref: Message = {
      body,
    };

    const options: ConsumerOptions = {
      topic: TOPIC,
    };
    let result: Message | undefined;
    let errorMessage: string | undefined;
    let messageId: string | undefined;

    /** server listens queue */
    const server = new ConsumerServer(
      connector,
      (ctx) => {
        if ((ctx.message as Message).message_id === messageId) {
          result = ctx.message;
        }
      },
      (err) => {
        errorMessage = err.message;
      },
      options,
    );
    server.start();

    /** client sends request */
    const sent = await client.createRequest({ topic: TOPIC }).send(body);
    messageId = sent.message.messageId;
    ref.message_id = messageId;
    expect(sent).toMatchObject({ status: ProduceMsgStatus.SUCCESS });
    /** eof request */

    await waitFor(3000, 1, () => !!result).catch((err) => {
      errorMessage = err.message;
    });

    server.stop();
    expect(errorMessage).toBeUndefined();

    expect(result).toMatchObject(ref);
  });
});
