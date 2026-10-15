# Table value formatting

`ValueDisplay` renders booleans, date-only strings, and numbers. `formatDisplayValue` returns the corresponding text. Both preserve the original value.

`TableFormatting` shows controlled format choices for application-supplied columns. The application stores choices and passes its formatting controls through `ReadOnlyTable.formatting`. Its `formatValue` callback applies each choice with `ValueDisplay`.

Boolean formats show check and cross symbols or Yes and No. Symbols expose accessible Yes and No labels. The text helper returns Yes or No for either boolean format. Empty values stay empty.

Date formats accept YYYY-MM-DD strings. The choices are ISO, short date, and long date. Date formatting uses UTC to preserve the original calendar day. The application supplies the locale. Invalid dates remain visible as their original text.

Number formats show the original number, locale-based groups, or two decimal places. Two decimal places round the displayed value. Sorting and filtering continue to use the original number.

Table uses `formatValue` for row cells and group values. The dashboard also applies its formatter through `formatSummary` for aggregate values.

The dashboard defaults ACTIVE to symbols, CREATED to ISO, and AMOUNT to the original number. Its FORMATTING section changes each column independently. Formatting does not change filters, grouping, source records, or the assigned table height.

Exports remain an application decision. These display choices do not rewrite server requests or export headers.
