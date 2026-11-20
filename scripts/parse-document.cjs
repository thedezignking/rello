/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Node worker. */
const { parentPort, workerData } = require("node:worker_threads");
// Inspect the ZIP directory before mammoth can inflate any content.
function checkDocx(bytes) {
  const b = Buffer.from(bytes);
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--)
    if (b.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw Error("Invalid ZIP");
  const count = b.readUInt16LE(end + 10),
    size = b.readUInt32LE(end + 12),
    start = b.readUInt32LE(end + 16);
  if (
    count > 200 ||
    count === 65535 ||
    start + size > end ||
    b.readUInt16LE(end + 4) ||
    b.readUInt16LE(end + 6)
  )
    throw Error("Unsupported archive");
  let pos = start,
    total = 0,
    document = false;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > b.length || b.readUInt32LE(pos) !== 0x02014b50) throw Error("Invalid ZIP directory");
    const flags = b.readUInt16LE(pos + 8),
      method = b.readUInt16LE(pos + 10),
      expanded = b.readUInt32LE(pos + 24);
    const names = b.readUInt16LE(pos + 28),
      extra = b.readUInt16LE(pos + 30),
      comment = b.readUInt16LE(pos + 32);
    const name = b.subarray(pos + 46, pos + 46 + names).toString("utf8");
    total += expanded;
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      expanded > 16 * 1024 * 1024 ||
      total > 32 * 1024 * 1024 ||
      name.includes("..") ||
      name.startsWith("/") ||
      name.includes("\\")
    )
      throw Error("Archive exceeds document limits");
    if (name === "word/document.xml") document = true;
    pos += 46 + names + extra + comment;
  }
  if (!document || pos !== start + size) throw Error("Not a DOCX");
}
(async () => {
  const bytes = new Uint8Array(workerData.bytes);
  let text;
  if (workerData.kind === "pdf") {
    const { getDocumentProxy, extractText } = await import("unpdf");
    const doc = await getDocumentProxy(bytes, { maxImageSize: 16777216 });
    if (doc.numPages > 20) throw Error("Maximum 20 pages");
    text = (await extractText(doc, { mergePages: true })).text;
    // This parser owns one document. The parent terminates the entire worker
    // on completion, failure, cancellation or timeout, releasing its resources.
  } else {
    checkDocx(bytes);
    text = (await require("mammoth").extractRawText({ buffer: Buffer.from(bytes) })).value;
  }
  if (text.length > 250000) throw Error("Document text exceeds limit");
  parentPort.postMessage({ text });
})().catch(() => parentPort.postMessage({ error: "This document cannot be read within the file limits." }));
