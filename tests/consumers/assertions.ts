export type Assert<T extends true> = T
export type IsAny<T> = 0 extends 1 & T ? true : false
export type AllTyped<T> = true extends {
  [K in keyof T]: IsAny<T[K]>
}[keyof T]
  ? false
  : true

type Untyped = ReturnType<typeof JSON.parse>
// @ts-expect-error An any type must fail the consumer contract.
export type RejectAny = Assert<AllTyped<{ entry: Untyped }>>
