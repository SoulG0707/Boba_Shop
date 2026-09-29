import { GAME_CONFIG } from "../config.js";
import { validateSaveSchema } from "../state/persistence.js";

const BACKUP_PREFIX = "BTRON1";
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export async function createBackup(state) {
  const jsonBytes = TEXT_ENCODER.encode(JSON.stringify(state));
  let mode = "J";
  let contentBytes = jsonBytes;
  if (typeof CompressionStream !== "undefined") {
    try {
      contentBytes = await transformBytes(jsonBytes, new CompressionStream("gzip"));
      mode = "G";
    } catch {
      contentBytes = jsonBytes;
      mode = "J";
    }
  }
  const payloadBytes = new Uint8Array(contentBytes.length + 1);
  payloadBytes[0] = mode.charCodeAt(0);
  payloadBytes.set(contentBytes, 1);
  const payload = bytesToBase64(payloadBytes);
  const checksum = await sha256(payloadBytes);
  return `${BACKUP_PREFIX}.${payload}.${checksum}`;
}

export async function restoreBackup(text) {
  const parts = String(text ?? "").trim().split(".");
  if (parts.length !== 3 || parts[0] !== BACKUP_PREFIX) throw new Error("Mã backup không đúng định dạng BTRON1.");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(parts[1]) || !/^[a-f0-9]{64}$/i.test(parts[2])) throw new Error("Dữ liệu backup bị lỗi định dạng.");

  const payloadBytes = base64ToBytes(parts[1]);
  const actualChecksum = await sha256(payloadBytes);
  if (!constantTimeEquals(actualChecksum.toLowerCase(), parts[2].toLowerCase())) throw new Error("Checksum không khớp; backup có thể đã bị thay đổi.");
  if (!payloadBytes.length) throw new Error("Backup không có dữ liệu.");

  const mode = String.fromCharCode(payloadBytes[0]);
  let jsonBytes = payloadBytes.slice(1);
  if (mode === "G") {
    if (typeof DecompressionStream === "undefined") throw new Error("Trình duyệt này chưa hỗ trợ giải nén backup gzip.");
    jsonBytes = await transformBytes(jsonBytes, new DecompressionStream("gzip"));
  } else if (mode !== "J") {
    throw new Error("Kiểu dữ liệu backup không được hỗ trợ.");
  }

  let state;
  try {
    state = JSON.parse(TEXT_DECODER.decode(jsonBytes));
  } catch {
    throw new Error("Không đọc được JSON trong backup.");
  }
  if (!validateSaveSchema(state) || state.version !== GAME_CONFIG.STATE_VERSION) throw new Error(`Backup không đúng schema hoặc phiên bản game ${GAME_CONFIG.STATE_VERSION}.`);
  return state;
}

async function transformBytes(bytes, streamTransform) {
  const blob = new Blob([bytes]);
  const transformed = blob.stream().pipeThrough(streamTransform);
  return new Uint8Array(await new Response(transformed).arrayBuffer());
}

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto API chưa sẵn sàng; hãy chạy game qua localhost hoặc HTTPS.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  let binary;
  try {
    binary = atob(value);
  } catch {
    throw new Error("Payload backup không phải Base64 hợp lệ.");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEquals(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
