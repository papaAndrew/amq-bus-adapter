import { ConsumerResult } from "../..";

export class MockConsumerRequest {
  _consumerResult: ConsumerResult;

  onConsumerRequest(consumerResult: ConsumerResult) {
    this._consumerResult = consumerResult;
  }
}
