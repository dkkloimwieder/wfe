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

/**
 * The host refused the outbox entry. `code` and `text` come from the reply.
 * A refused reply without a refusal gets the code 'refused'.
 */
export class OutboxRefused extends Error {
  readonly code: string
  readonly text: string
  readonly seq: number
  constructor(
    seq: number,
    refusal: { code: string; text: string } = {
      code: 'refused',
      text: 'The host refused the write',
    },
    options?: ErrorOptions,
  ) {
    super(refusal.text, options)
    this.name = 'OutboxRefused'
    this.code = refusal.code
    this.text = refusal.text
    this.seq = seq
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
