export class MockErrorHandler {
  asError?: Error;

  handleError(err: any) {
    this.asError = err;
  }
}
