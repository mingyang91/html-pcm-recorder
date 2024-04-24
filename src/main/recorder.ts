import { filter, map, Subject } from 'rxjs'

export function audioStream() {
  const subject = new Subject<ArrayBuffer>();
  (async () => {
    let context = new AudioContext({
      // if Non-interactive, use 'playback' or 'balanced' // https://developer.mozilla.org/en-US/docs/Web/API/AudioContextLatencyCategory
      latencyHint: 'interactive',
    });

    await context.audioWorklet.addModule('recorderWorkletProcessor.js')

    const globalStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 44100,
        sampleSize: 32,
      }
    })
    let input = context.createMediaStreamSource(globalStream)
    let processor = new window.AudioWorkletNode(
      context,
      'recorder.worklet'
    );
    processor.connect(context.destination);
    context.resume()
    input.connect(processor)
    processor.port.onmessage = (e) => {
      const audioData = e.data;
      subject.next(audioData)
    }
    subject.subscribe({
      complete() {
        globalStream.getTracks()[0].stop();
        input.disconnect(processor);
        processor.disconnect(context.destination);
        context.close().then(function () { });
        console.log('Recording completed')
      }
    })
  })()

  return subject
}

export function toWave(subject: Subject<ArrayBuffer>, options: WriterOptions): Promise<ArrayBuffer[]> {
  return new Promise((resolve, reject) => {
    let dataLength = 0
    const buffers: ArrayBuffer[] = []
    subject.subscribe({
      next(value: ArrayBuffer) {
        dataLength += value.byteLength
        buffers.push(value)
      },
      complete() {
        const header = wavHeader(dataLength, options)
        resolve([header, ...buffers])
      },
      error(e) {
        reject(e)
      }
    })
  })
}


export function wavHeader(dataLength: number, options: WriterOptions) {
  const format = 1; // raw PCM
  const channels = options.channels || 2;
  const sampleRate = options.sampleRate || 44100;
  const bitDepth = options.bitDepth || 16;


  // TODO: 44 is only for format 1 (PCM), any other
  // format will have a variable size...
  const headerLength = 44;

  const fileSize = dataLength + headerLength;
  const buffer = new ArrayBuffer(44);
  const view = new Uint8Array(buffer);
  let offset = 0;

  // write the "RIFF" identifier
  const RIFF = str2ab('RIFF')
  view.set(RIFF, offset)
  offset += RIFF.length;

  // write the file size minus the identifier and this 32-bit int
  new Uint32Array(view.buffer, offset, 1)[0] = fileSize - 8
  offset += 4;

  // write the "WAVE" identifier
  const WAVE = str2ab('WAVE')
  view.set(WAVE, offset)
  offset += WAVE.length;

  // write the "fmt " sub-chunk identifier
  const fmt = str2ab('fmt ')
  view.set(fmt, offset)
  offset += fmt.length;

  // write the size of the "fmt " chunk
  // XXX: value of 16 is hard-coded for raw PCM format. other formats have
  // different size.
  new Uint32Array(view.buffer, offset, 1)[0] = 16
  offset += 4;

  // write the audio format code
  new Uint16Array(view.buffer, offset, 1)[0] = 1
  offset += 2;

  // write the number of channels
  new Uint16Array(view.buffer, offset, 1)[0] = channels
  offset += 2;

  // write the sample rate
  new Uint32Array(view.buffer, offset, 1)[0] = sampleRate
  offset += 4;

  // write the byte rate
  const byteRate = sampleRate * channels * bitDepth / 8;
  new Uint32Array(view.buffer, offset, 1)[0] = byteRate
  offset += 4;

  // write the block align
  const blockAlign = channels * bitDepth / 8;
  new Uint16Array(view.buffer, offset, 1)[0] = blockAlign
  offset += 2;

  // write the bits per sample
  new Uint16Array(view.buffer, offset, 1)[0] = bitDepth
  offset += 2;

  // write the "data" sub-chunk ID
  const DATA = str2ab('data')
  new Uint8Array(view.buffer, offset, 4).set(DATA)
  offset += DATA.length;

  // write the remaining length of the rest of the data
  // header['writeUInt32' + this.endianness](dataLength, offset);
  new Uint32Array(view.buffer, offset, 1)[0] = dataLength
  offset += 4;

  // save the "header" Buffer for the end, we emit the "header" event at the end
  // with the "size" values properly filled out. if this stream is being piped to
  // a file (or anything else seekable), then this correct header should be placed
  // at the very beginning of the file.
  return buffer
}

interface WriterOptions {
  format?: number | undefined;
  channels?: number | undefined;
  sampleRate?: number | undefined;
  bitDepth?: number | undefined;
}


function str2ab(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}
