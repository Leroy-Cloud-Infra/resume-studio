/**
 * Convert a Custom Section textarea value into persisted lines without
 * normalizing whitespace. Controlled textareas must preserve a trailing space
 * while a user is typing; trimming on every change makes that space impossible
 * to enter.
 */
export function parseCustomSectionLines(value: string): string[] {
  return value.split("\n");
}

/**
 * Convert the Education coursework textarea into one item per non-empty line
 * without trimming the original text while it is being edited.
 */
export function parseCourseworkLines(value: string): string[] {
  return value.split("\n").filter((line) => line.trim().length > 0);
}
