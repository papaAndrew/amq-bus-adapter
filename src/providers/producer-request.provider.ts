import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { AmqBusBindings, Producer, ProducerRequest } from "./types";

@injectable({ scope: BindingScope.REQUEST })
export class ProducerRequestProvider implements Provider<ProducerRequest> {
  constructor(
    @inject(AmqBusBindings.PRODUCER)
    private producer: Producer,
  ) {}

  value(): ProducerRequest {
    const producerRequest: ProducerRequest = {
      address: this.producer.getSenderAddress(),
      replyTo: this.producer.getReceiverAddress(),
      send: this.producer.send.bind(this.producer),
      requestReply: this.producer.requestReply.bind(this.producer),
    };
    return producerRequest;
  }
}
