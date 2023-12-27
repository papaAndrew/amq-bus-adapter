import { describe } from "@jest/globals";
import { AmqbLogAdapter } from "../lib/amqb-log-adapter";
import { AmqpConnector } from "../lib/amqp-connector";
import { ProducerClient } from "../lib/producer-client";
import { AmqConnector, ProduceMsgStatus } from "../lib/types";
import { CONNECION_OPTIONS } from "./helpers";
// import {AMQA_CREDENTIALS} from './secret';

const TOPIC_REQUEST = "AMQADAPTER.TEST.OUT";

describe("AmqBusProducer", () => {
  let connector: AmqConnector;

  beforeAll(async () => {
    connector = new AmqpConnector(CONNECION_OPTIONS);
  });

  afterAll(() => {
    connector.disconnect();
  });

  it("Send request return connection error", async () => {
    const body = "Send request return error";
    const ref = {
      status: ProduceMsgStatus.CONNECTION_ERROR,
      address: TOPIC_REQUEST,
    };
    const client = new ProducerClient(new AmqbLogAdapter(), connector);

    const request = client.createRequest();
    const result = await request.send({
      topic: TOPIC_REQUEST,
      body,
    });
    // console.log("result", result);

    expect(result).toMatchObject(ref);
  });

  it("Send request when it configured by 'request.send' method", async () => {
    const body = "Send request when it configured by 'request.send' method";
    const ref = {
      status: ProduceMsgStatus.SUCCESS,
      address: TOPIC_REQUEST,
      message: {
        data: body,
      },
    };
    await connector.connect();
    const client = new ProducerClient(new AmqbLogAdapter(), connector);

    const request = client.createRequest();
    const result = await request.send({
      topic: TOPIC_REQUEST,
      body,
    });

    expect(result).toMatchObject(ref);
  });

  it("Send request when it configured by 'client.createRequest' and 'request.send' methods", async () => {
    const body =
      "Send request when it configured by 'client.createRequest' and 'request.send' methods";
    const ref = {
      status: ProduceMsgStatus.SUCCESS,
      address: TOPIC_REQUEST,
      message: {
        data: body,
      },
    };
    await connector.connect();
    const client = new ProducerClient(new AmqbLogAdapter(), connector);
    const config = {
      topic: TOPIC_REQUEST,
    };
    const request = client.createRequest(config);
    const result = await request.send(body);

    expect(result).toMatchObject(ref);
  });

  it("Send request when it configured by 'ProducerClient.constructor' and 'request.send' methods", async () => {
    const body =
      "Send request when it configured by 'ProducerClient.constructor' and 'request.send' methods";
    const ref = {
      status: ProduceMsgStatus.SUCCESS,
      address: TOPIC_REQUEST,
      message: {
        data: body,
      },
    };
    const options = {
      topic: TOPIC_REQUEST,
    };
    await connector.connect();
    const client = new ProducerClient(new AmqbLogAdapter(), connector, options);

    const request = client.createRequest();
    const result = await request.send(body);

    expect(result).toMatchObject(ref);
  });
});
