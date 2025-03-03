// Standard library dependencies
export {
  serve,
  type Handler,
  type ConnInfo,
  type ServeInit,
} from "@deno/http";

// Base64 utilities
export {
  encodeBase64 as base64Encode,
  decodeBase64 as base64Decode,
} from "@deno/base64";

// WebSocket from npm
export {
  WebSocket,
} from "@ws";

// Re-export commonly used utilities
export { delay } from "@deno/async";

// Path utilities
// Path utilities
export {
  join,
  dirname,
  basename,
  extname
} from "@deno/path";

// File system utilities
export { exists } from "@deno/exists";

// CLI flags
export {
  parse as parseFlags
} from "@deno/flags";

// Colors for CLI output
export {
  red,
  green,
  blue,
  yellow
} from "@deno/fmt";