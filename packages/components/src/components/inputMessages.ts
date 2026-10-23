import { resolveMessages } from '../internal/messages'

export interface FileInputMessages {
  required: string
  chooseFile: string
  chooseFiles: string
  dropHelp: (multiple: boolean) => string
  noFiles: string
  fileSize: (bytes: number) => string
  remove: string
  removeFile: (file: File) => string
  requiredError: string
  singleError: string
  selectionError: string
  typeError: string
  sizeError: string
}
export interface NumberInputMessages {
  requiredError: string
  invalidError: string
  minimumError: (minimum: number) => string
  maximumError: (maximum: number) => string
}
export const fileInputMessages: Readonly<FileInputMessages> = {
  required: 'Required',
  chooseFile: 'Choose file',
  chooseFiles: 'Choose files',
  dropHelp: (multiple) => `Or drop ${multiple ? 'files' : 'a file'} here`,
  noFiles: 'No files selected',
  fileSize: (bytes) => `${bytes} bytes`,
  remove: 'Remove',
  removeFile: (file) => `Remove ${file.name}`,
  requiredError: 'Choose a file.',
  singleError: 'Select one file.',
  selectionError: 'The selected files do not meet the type or size limits.',
  typeError: 'File type is not allowed.',
  sizeError: 'File exceeds the size limit.',
}
export const numberInputMessages: Readonly<NumberInputMessages> = {
  requiredError: 'Enter a number.',
  invalidError: 'Enter a complete, finite number.',
  minimumError: (min) => `Enter a number greater than or equal to ${min}.`,
  maximumError: (max) => `Enter a number less than or equal to ${max}.`,
}
export const resolveFileInputMessages = (
  overrides: () => Partial<FileInputMessages> | undefined,
) => resolveMessages(fileInputMessages, overrides)
export const resolveNumberInputMessages = (
  overrides: () => Partial<NumberInputMessages> | undefined,
) => resolveMessages(numberInputMessages, overrides)
