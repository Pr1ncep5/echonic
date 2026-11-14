/** A silent WAV file of the given length: 8 kHz, mono, 8-bit, so it stays small. */
export function wavOfSeconds(seconds: number): Buffer {
  const sampleRate = 8000;
  const dataSize = Math.round(sampleRate * seconds);
  const buffer = Buffer.alloc(44 + dataSize, 128);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // size of the format chunk
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // channels
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28); // bytes per second
  buffer.writeUInt16LE(1, 32); // bytes per sample frame
  buffer.writeUInt16LE(8, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}
