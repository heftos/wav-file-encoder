export const enum WavFileType {
   int16,                                                  // 16 bit signed integer
   float32 }                                               // 32 bit float within the range -1 to +1

export function encodeWavFile (audioBuffer: AudioBuffer, wavFileType: WavFileType) : ArrayBuffer {
   let bitsPerSample: number;
   let formatCode: number;
   let writeSampleData: () => void;
   switch (wavFileType) {
      case WavFileType.int16: {
         bitsPerSample = 16;
         formatCode = 1;                                   // WAVE_FORMAT_PCM
         writeSampleData = writeSampleData_int16;
         break; }
      case WavFileType.float32: {
         bitsPerSample = 32;
         formatCode = 3;                                   // WAVE_FORMAT_IEEE_FLOAT
         writeSampleData = writeSampleData_float32;
         break; }
      default: {
         throw new Error(); }}
   const numberOfChannels = audioBuffer.numberOfChannels;
   const numberOfFrames = audioBuffer.length;
   const sampleRate = audioBuffer.sampleRate;
   const bytesPerSample = Math.ceil(bitsPerSample / 8);
   const bytesPerFrame = numberOfChannels * bytesPerSample;
   const bytesPerSec = sampleRate * numberOfChannels * bytesPerSample;
   const headerLength = 44;
   const sampleDataLength = numberOfChannels * numberOfFrames * bytesPerSample;
   const fileLength = headerLength + sampleDataLength;
   const arrayBuffer = new ArrayBuffer(fileLength);
   const dataView = new DataView(arrayBuffer);
   const channelData: Float32Array[] = Array(numberOfChannels);
   for (let channelNo = 0; channelNo < numberOfChannels; channelNo++) {
       channelData[channelNo] = audioBuffer.getChannelData(channelNo); }
   writeWavFileHeader();
   writeSampleData();
   return arrayBuffer;

   function writeWavFileHeader() {
      setString(0, "RIFF");                                // chunk ID
      dataView.setUint32(4, fileLength - 8, true);         // chunk size
      setString(8, "WAVE");                                // WAVEID
      setString(12, "fmt ");                               // chunk ID
      dataView.setUint32(16, 16, true);                    // chunk size
      dataView.setUint16(20, formatCode, true);            // wFormatTag
      dataView.setUint16(22, numberOfChannels, true);      // nChannels
      dataView.setUint32(24, sampleRate, true);            // nSamplesPerSec
      dataView.setUint32(28, bytesPerSec, true);           // nAvgBytesPerSec
      dataView.setUint16(32, bytesPerFrame, true);         // nBlockAlign
      dataView.setUint16(34, bitsPerSample, true);         // wBitsPerSample
      setString(36, "data");                               // chunk ID
      dataView.setUint32(40, sampleDataLength, true); }    // chunk size

   function writeSampleData_int16() {
      let offs = headerLength;
      for (let frameNo = 0; frameNo < numberOfFrames; frameNo++) {
         for (let channelNo = 0; channelNo < numberOfChannels; channelNo++) {
            const sampleValueFloat = channelData[channelNo][frameNo];
            const sampleValueInt16 = convertFloatSampleToInt16(sampleValueFloat);
            dataView.setInt16(offs, sampleValueInt16, true);
            offs += 2; }}}

   function writeSampleData_float32() {
      let offs = headerLength;
      for (let frameNo = 0; frameNo < numberOfFrames; frameNo++) {
         for (let channelNo = 0; channelNo < numberOfChannels; channelNo++) {
            const sampleValueFloat = channelData[channelNo][frameNo];
            dataView.setFloat32(offs, sampleValueFloat, true);
            offs += 4; }}}

   // When converting PCM sample values from float to signed 16 bit, the midpoint must remain 0.
   // There are several options for the 16-bit quantization:
   //  Option A: [-1 .. 1]       ==> [-32768 .. 32767]   asymetric
   //  Option B: [-1 .. 1]       ==> [-32767 .. 32767]   symetric, bit patterns are distorted
   //  Option C: [-1 .. 0.99997] ==> [-32768 .. 32767]   symetric, +1 value is clipped
   function convertFloatSampleToInt16 (v: number) {
      // Option A:
      //   return v < 0 ?
      //      Math.max(-32768, Math.round(v * 32768)) :
      //      Math.min( 32767, Math.round(v * 32767)); }
      // Option B:
      //    return Math.max(-32768, Math.min(32767, Math.round(v * 32767))); }
      // Option C:
            return Math.max(-32768, Math.min(32767, Math.round(v * 32768))); }

   function setString (offset: number, value: string) {
      for (let p = 0; p < value.length; p++) {
         dataView.setUint8(offset + p, value.charCodeAt(p)); }}

   }
