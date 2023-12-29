import { describe } from "@jest/globals";
import { Message } from "rhea";
import { AmqbLogAdapter } from "../lib/amqb-log-adapter";
import { AmqpConnector } from "../lib/amqp-connector";
import { ProducerClient } from "../lib/producer-client";
import { ServerRequest } from "../lib/server-request";
import { ServerResponse } from "../lib/server-response";
import { genUuid4 } from "../lib/tools";
import { AmqConnector, AmqMessage, ConsumerOptions } from "../lib/types";
import { CONNECION_OPTIONS } from "./helpers";

const OPTIONS: ConsumerOptions = {
  topic: "AMQADAPTER.TEST.IN",
  replyTo: "AMQADAPTER.TEST.OUT",
  timeout: 2000,
};

describe("Server request-reply pattern", () => {
  const errorHandler = () => {};
  let logAdapter: AmqbLogAdapter;
  let connector: AmqConnector;
  let client: ProducerClient;
  let request: ServerRequest;
  // let response: ServerResponse;
  // let context: ServerContext;

  beforeAll(async () => {
    logAdapter = new AmqbLogAdapter();
    connector = new AmqpConnector(CONNECION_OPTIONS);
    await connector.connect();

    client = new ProducerClient(logAdapter, connector);

    request = new ServerRequest(logAdapter, OPTIONS.topic);

    // response = new ServerResponse(
    //   logAdapter,
    //   connector,
    //   OPTIONS,

    // )
    // context = new ServerContext(
    //   request,
    //   response
    // )
  });

  afterAll(() => {
    connector.disconnect();
  });

  it("ServerRequest receives the message", async () => {
    const body = "ServerRequest receives the message";
    const messageId = genUuid4();

    const ref: AmqMessage = {
      messageId,
      data: body,
    };

    const message: Message = {
      body,
      message_id: messageId,
    };
    request.consume(message);

    expect(request.incomingMessage).toMatchObject(ref);
  });

  it("ServerResponse need callback to receive response", async () => {
    const requestBody =
      "ServerResponse need callback to get response from request";
    const responseBody = "ServerResponse acheives the response";
    const messageId = genUuid4();

    const ref: AmqMessage = {
      data: responseBody,
      correlationId: messageId,
    };

    const result: {
      requestBody?: string;
      responseBody?: string;
    } = {};

    /**
     * Программируем callback для ServerResponse
     * @param body тело запроса
     * @returns
     */
    const responseBuilder = (body: string) => {
      result.requestBody = body;
      result.responseBody = responseBody;
      // console.log("result", result);

      return result.responseBody;
    };
    /** eof */

    const response = new ServerResponse(
      logAdapter,
      connector,
      OPTIONS,
      responseBuilder,
    );

    await response.produce({
      messageId,
      data: requestBody,
    });

    expect(response.outcomingMessage).toMatchObject(ref);
  });

  it("ServerResponse does not buid the response if responseBuider returns void", async () => {
    const requestBody =
      "ServerResponse does not buid the response if responseBuider returns void";
    const responseBody = "ServerResponse acheives the response";
    const messageId = genUuid4();

    const ref: AmqMessage = {
      data: responseBody,
      correlationId: messageId,
    };

    const result: {
      requestBody?: string;
      responseBody?: string;
    } = {};

    /**
     * Программируем callback для ServerResponse
     * @param body тело запроса
     * @returns
     */
    const responseBuilder = (body: string) => {
      result.requestBody = body;
      result.responseBody = responseBody;
      // return void;
    };
    /** eof */

    const response = new ServerResponse(
      logAdapter,
      connector,
      OPTIONS,
      responseBuilder,
    );

    await response.produce({
      messageId,
      data: requestBody,
    });

    expect(response.outcomingMessage.data).toBeNull();
  });
});
