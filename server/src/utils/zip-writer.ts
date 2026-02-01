import { Writable } from 'stream';

// Minimal ZIP writer (stored entries, no compression, no Zip64).
type ZipEntry = {
  name: string;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  offset: number;
  modTime: number;
  modDate: number;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const updateCrc = (buf: Buffer, previous: number) => {
  let crc = previous ^ 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const toDosDateTime = (date: Date) => {
  const year = Math.max(1980, date.getUTCFullYear());
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = Math.floor(date.getUTCSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  return { dosDate, dosTime };
};

export class ZipEntryWriter {
  private readonly zipWriter: ZipWriter;
  private readonly entry: ZipEntry;
  private crc = 0;
  private uncompressedSize = 0;

  constructor(zipWriter: ZipWriter, entry: ZipEntry) {
    this.zipWriter = zipWriter;
    this.entry = entry;
  }

  async write(chunk: Buffer | string) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (buffer.length === 0) return;
    this.crc = updateCrc(buffer, this.crc);
    this.uncompressedSize += buffer.length;
    await this.zipWriter.writeBuffer(buffer);
  }

  async end() {
    this.entry.crc = this.crc;
    this.entry.uncompressedSize = this.uncompressedSize;
    this.entry.compressedSize = this.uncompressedSize;
    await this.zipWriter.writeDataDescriptor(this.entry);
    this.zipWriter.registerEntry(this.entry);
  }
}

export class ZipWriter {
  private readonly out: Writable;
  private readonly entries: ZipEntry[] = [];
  private offset = 0;

  constructor(out: Writable) {
    this.out = out;
  }

  async startFile(name: string, modDate = new Date()): Promise<ZipEntryWriter> {
    const nameBuf = Buffer.from(name);
    const { dosDate, dosTime } = toDosDateTime(modDate);
    const entry: ZipEntry = {
      name,
      crc: 0,
      compressedSize: 0,
      uncompressedSize: 0,
      offset: this.offset,
      modTime: dosTime,
      modDate: dosDate,
    };

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x08, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(entry.modTime, 10);
    header.writeUInt16LE(entry.modDate, 12);
    header.writeUInt32LE(0, 14);
    header.writeUInt32LE(0, 18);
    header.writeUInt32LE(0, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);

    await this.writeBuffer(header);
    await this.writeBuffer(nameBuf);

    return new ZipEntryWriter(this, entry);
  }

  async finalize(endStream = true) {
    const centralDirectoryOffset = this.offset;
    for (const entry of this.entries) {
      await this.writeCentralDirectoryEntry(entry);
    }
    const centralDirectorySize = this.offset - centralDirectoryOffset;
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(this.entries.length, 8);
    endRecord.writeUInt16LE(this.entries.length, 10);
    endRecord.writeUInt32LE(centralDirectorySize, 12);
    endRecord.writeUInt32LE(centralDirectoryOffset, 16);
    endRecord.writeUInt16LE(0, 20);
    await this.writeBuffer(endRecord);
    if (endStream) {
      this.out.end();
    }
  }

  registerEntry(entry: ZipEntry) {
    this.entries.push(entry);
  }

  async writeBuffer(buffer: Buffer) {
    const canWrite = this.out.write(buffer);
    if (!canWrite) {
      await new Promise<void>((resolve, reject) => {
        const onDrain = () => {
          this.out.removeListener('error', onError);
          resolve();
        };
        const onError = (err: Error) => {
          this.out.removeListener('drain', onDrain);
          reject(err);
        };
        this.out.once('drain', onDrain);
        this.out.once('error', onError);
      });
    }
    this.offset += buffer.length;
  }

  async writeDataDescriptor(entry: ZipEntry) {
    const descriptor = Buffer.alloc(16);
    descriptor.writeUInt32LE(0x08074b50, 0);
    descriptor.writeUInt32LE(entry.crc >>> 0, 4);
    descriptor.writeUInt32LE(entry.compressedSize >>> 0, 8);
    descriptor.writeUInt32LE(entry.uncompressedSize >>> 0, 12);
    await this.writeBuffer(descriptor);
  }

  private async writeCentralDirectoryEntry(entry: ZipEntry) {
    const nameBuf = Buffer.from(entry.name);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x08, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(entry.modTime, 12);
    header.writeUInt16LE(entry.modDate, 14);
    header.writeUInt32LE(entry.crc >>> 0, 16);
    header.writeUInt32LE(entry.compressedSize >>> 0, 20);
    header.writeUInt32LE(entry.uncompressedSize >>> 0, 24);
    header.writeUInt16LE(nameBuf.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(entry.offset >>> 0, 42);
    await this.writeBuffer(header);
    await this.writeBuffer(nameBuf);
  }
}
