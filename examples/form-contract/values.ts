export type ExampleValues = { name: string; category: string; enabled: boolean }
export const initialValues: Readonly<ExampleValues> = Object.freeze({
  name: 'Draft record',
  category: 'General',
  enabled: false,
})
