/**
 * `Feed.changes` throws this when the host no longer holds the cursor. The
 * collection then lists again and follows from the new cursor. The package
 * inspects no other error shape.
 */
export class CursorExpired extends Error {
  constructor(
    message = 'The host no longer holds this cursor',
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'CursorExpired'
  }
}

/** The outbox entry was discarded before the host took it. */
export class OutboxDiscarded extends Error {
  readonly seq: number
  constructor(seq: number, options?: ErrorOptions) {
    super(`The outbox entry ${seq} was discarded`, options)
    this.name = 'OutboxDiscarded'
    this.seq = seq
  }
}
