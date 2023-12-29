import { describe } from "@jest/globals";
import { AmqbLogAdapter } from "../lib/amqb-log-adapter";
import { AmqpConnector } from "../lib/amqp-connector";
import { ProducerClient } from "../lib/producer-client";
import { genUuid4 } from "../lib/tools";
import { AmqConnector, ConsumeMsgResult, ConsumeMsgStatus } from "../lib/types";
import { CONNECION_OPTIONS } from "./helpers";

const TOPIC_RQ = "AMQADAPTER.TEST.OUT";
const TOPIC_RS = "AMQADAPTER.TEST.IN";

describe.skip("request-reply pattern", () => {
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

  it("single request response", async () => {
    const body = "single request";
    const ref: ConsumeMsgResult = {
      status: ConsumeMsgStatus.SUCCESS,
      address: TOPIC_RS,
      message: {
        data: "single response",
      },
    };

    const request = await client
      .createRequest({
        topic: TOPIC_RQ,
        replyTo: TOPIC_RS,
        timeout: 3000,
      })
      .send(body);

    ref.message.correlationId = request.message.messageId;

    /** mock response */
    const mockResponse = await client.createRequest().send({
      topic: TOPIC_RS,
      correlationId: request.message.messageId,
      body: ref.message.data,
    });
    /** eof mock */

    const result = await request.receiveResponse();

    expect(result).toMatchObject(ref);
  });

  it("empty correlationId message is not response", async () => {
    const body = "empty correlationId message is not response";
    const ref: ConsumeMsgResult = {
      status: ConsumeMsgStatus.TIMED_OUT,
      address: TOPIC_RS,
    };

    const request = await client
      .createRequest({
        topic: TOPIC_RQ,
        replyTo: TOPIC_RS,
        timeout: 3000,
      })
      .send(body);

    /** mock response */
    const mockResponse = await client.createRequest().send({
      topic: TOPIC_RS,
      // correlationId: "request.message.messageId",
      body,
    });
    /** eof mock */

    const result = await request.receiveResponse();

    expect(result).toMatchObject(ref);
  });

  it("wrong correlationId message is not response", async () => {
    const body = "wrong correlationId message is not response";
    const ref: ConsumeMsgResult = {
      status: ConsumeMsgStatus.TIMED_OUT,
      address: TOPIC_RS,
    };

    const request = await client
      .createRequest({
        topic: TOPIC_RQ,
        replyTo: TOPIC_RS,
        timeout: 3000,
      })
      .send(body);

    /** mock response */
    const mockResponse = await client.createRequest().send({
      topic: TOPIC_RS,
      correlationId: genUuid4(),
      body,
    });
    /** eof mock */

    const result = await request.receiveResponse();

    expect(result).toMatchObject(ref);
  });

  it("having no response, timed out", async () => {
    const body = "having no response, timed out";
    const ref: ConsumeMsgResult = {
      status: ConsumeMsgStatus.TIMED_OUT,
      address: TOPIC_RS,
    };

    const timeout = 2000;

    const request = await client
      .createRequest({
        topic: TOPIC_RQ,
        replyTo: TOPIC_RS,
        timeout,
      })
      .send(body);

    const result = await request.receiveResponse();

    expect(result).toMatchObject(ref);
  });
});
