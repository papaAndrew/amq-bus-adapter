import { AmqBusLogAdapter, AmqMessage, OperationResult } from "../..";

export class MockLogAdapter implements AmqBusLogAdapter {
  onConnect(ctx: any): void {
    throw new Error("Method not implemented.");
  }
  onDisconnect(ctx: any): void {
    throw new Error("Method not implemented.");
  }

  _producerOpen: any;
  onProducerOpen(ctx: any): void {
    this._producerOpen = ctx;
    console.log("onProducerOpen", this._producerOpen);
  }

  _producerRequest: OperationResult;
  onProducerRequest(operationResult: OperationResult): void {
    this._producerRequest = operationResult;
    console.log("onProducerRequest", this._producerRequest);
  }
  _producerResponse: OperationResult;
  onProducerResponse(operationResult: OperationResult): void {
    this._producerResponse = operationResult;
  }

  _consumerOpen: any;
  onConsumerOpen(ctx: any): void {
    this._consumerOpen = ctx;
    console.log("onConsumerOpen", this._consumerOpen);
  }

  _consumerRequest: OperationResult;
  onConsumerRequest(operationResult: OperationResult): void {
    this._consumerRequest = operationResult;
    console.log("onConsumerRequest", this._consumerRequest);
  }
  onConsumerResponse(operationResult: OperationResult): void {
    throw new Error("Method not implemented.");
  }
  onConnectionError(ctx: any): void {
    throw new Error("Method not implemented.");
  }
  onSenderError(ctx: any): void {
    throw new Error("Method not implemented.");
  }
  onReceiverError(ctx: any): void {
    throw new Error("Method not implemented.");
  }
  onError(message: string, err: any): void {
    throw new Error("Method not implemented.");
  }
  _receiverMessage: AmqMessage;
  onReceiverMessage(msg: AmqMessage): void {
    this._receiverMessage = msg;
    console.log("onReceiverMessage", this._receiverMessage);
  }
}
