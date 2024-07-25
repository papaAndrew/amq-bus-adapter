import { ConnectionDetails, Message } from "rhea";
import { Stream } from "stream";
import { v4 as uuid4 } from "uuid";
import {
  AmqMessage,
  ConnectionDetailsFunction,
  MessageHeaders,
  RequestConfig,
} from "./types";

export function anyToString(data: any): string {
  if (Buffer.isBuffer(data)) {
    return data.toString();
  }
  if (data instanceof Stream) {
    return "[*stream]";
  }

  switch (typeof data) {
    case "string":
    case "bigint":
    case "boolean":
    case "number":
      return String(data);
    case "object":
      return JSON.stringify(data);
    default:
      return `[*${typeof data}]`;
  }
}

/**
 *
 * @param message
 * @returns
 */
export function rheaToAmqMessage<T extends AmqMessage>(message: Message): T {
  const {
    body,
    correlation_id,
    message_id,
    creation_time,
    application_properties,
  } = message as Message;

  const result: AmqMessage = {
    data: body ? anyToString(body) : null,
  };
  if (creation_time) {
    result.created = creation_time?.toISOString();
  }
  if (correlation_id) {
    result.correlationId = anyToString(correlation_id);
  }
  if (message_id) {
    result.messageId = anyToString(message_id);
  }
  if (application_properties) {
    result.headers = application_properties;
  }
  return result as T;
}

export function waitFor<T = boolean>(
  timeout: number,
  interval: number,
  haveResult: (timer: number) => T | undefined,
): Promise<T> {
  const timeStart = new Date().getTime();
  const timeStop = timeStart + timeout;

  return new Promise((resolve, reject) => {
    const task = () => {
      const now = new Date().getTime();
      if (now > timeStop) {
        const err = new Error(`Timeout elapsed (${timeout} ms)`);
        reject(err);
        return;
      }
      const result = haveResult(now - timeStart);
      if (result) {
        resolve(result);
        return;
      }
      // timer = timer -= interval;
      setTimeout(task, interval);
    };
    task();
  });
}

export function genUuid4() {
  return uuid4();
}

export function nowLocaleTime(): string {
  const localTime = new Date().toISOString();
  return localTime;
}

export function getConnectionDetails(
  brokers: string,
  defaultOptions?: object,
): ConnectionDetailsFunction {
  const connectionDetails: ConnectionDetails[] = brokers
    .split(",")
    .map((broker) => {
      const [host, port] = broker.split(":");
      const details: ConnectionDetails = {
        ...defaultOptions,
        host,
        port: Number(port),
      };
      return details;
    });

  let attempt = 0;
  const cdf = () => {
    const idx = attempt % connectionDetails.length;
    console.log({
      action: "getConnectionDetails",
      attempt: (attempt += 1),
      connectionDetails: connectionDetails[idx],
    });
    return connectionDetails[idx];
  };
  return cdf;
}

export function buildRequest(
  bodyOrConfig: string | RequestConfig,
): RequestConfig {
  const requestConfig: RequestConfig =
    typeof bodyOrConfig === "string" ? { body: bodyOrConfig } : bodyOrConfig;

  if (!requestConfig.correlationId) {
    requestConfig.correlationId = genUuid4();
  }

  return requestConfig;
}

export function requestToMessage(
  bodyOrConfig: string | RequestConfig,
): Message {
  const { body, correlationId, headers } = buildRequest(bodyOrConfig);
  const message: Message = {
    body,
    correlation_id: correlationId,
    application_properties: headers,
  };
  return message;
}

/**
 * key1: value1, key2: value2, ...
 * @param headers
 */
export function headersToString(headers: MessageHeaders): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .reduce((prev, next) => `${prev}\n${next}`, "");
}
