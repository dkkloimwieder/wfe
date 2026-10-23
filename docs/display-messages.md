# Status and display messages

Applications can supply component-owned text through a typed, partial `messages` prop. Omitted keys retain the exported English defaults. Changing messages updates the existing controls. It does not reset an open notification, move focus, or change accepted data.

| Component    | Message type and defaults                      | Keys                                                   |
| ------------ | ---------------------------------------------- | ------------------------------------------------------ |
| Toast        | `ToastMessages`, `toastMessages`               | `regionLabel`, `dismissLabel`, `close`                 |
| AlertDialog  | `AlertDialogMessages`, `alertDialogMessages`   | `cancel`                                               |
| ValueDisplay | `ValueDisplayMessages`, `valueDisplayMessages` | `yes`, `no`, `emptyValue`                              |
| StatusTile   | `StatusTileMessages`, `statusTileMessages`     | `ok`, `warning`, `unknown`, plus the ValueDisplay keys |

These exports are available from `@wfe/components`. AlertDialog also exports its contract from `@wfe/components/alert-dialog`.

Toast.Region supplies messages to its contained Toast roots. A root can override those messages for its own notification. Toast.CloseButton can override them again. Explicit `aria-label` and button children take precedence. Notification titles, descriptions, and other caller content are unchanged. Live-region priority, dismissal, keyboard handling, and timer behavior remain the same.

AlertDialog supplies its cancel message to AlertDialog.Cancel. The cancel part also accepts a partial messages override. Explicit cancel children and `aria-label` keep their existing precedence. The application supplies the alert title, description, and action text. Generic Dialog.CloseButton has no default label to translate.

ValueDisplay uses `yes` and `no` for boolean text and the accessible name of a boolean symbol. `emptyValue` replaces null, undefined, or empty-string values; its default is an empty string. StatusTile forwards these messages to formatted values and uses `emptyValue` for an empty unformatted value. Unformatted nonempty values remain caller content.

Messages do not select number or date formats. Continue to supply `locale`, date/time formats, and timezone separately. The low-level `formatDisplayValue` utility retains its existing English boolean output; use ValueDisplay for message-aware UI.

The shared hydration example includes Spanish display messages, a French switch, and a dismissible notification. Its review checks adoption of server elements and keyboard dismissal. Unit tests cover partial defaults, retained elements and focus, explicit-label precedence, and disposal.
