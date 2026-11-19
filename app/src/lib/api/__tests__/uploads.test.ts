import { detectImageType } from '../http/uploads';

jest.mock('expo-file-system', () => ({ File: class {} }));

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((v) => (typeof v === 'string' ? [...v].map((c) => c.charCodeAt(0)) : [v])),
  );

describe('detectImageType', () => {
  it.each([
    ['image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe1)],
    ['image/png', bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a)],
    ['image/webp', bytes('RIFF', 0, 0, 0, 0, 'WEBP')],
    ['image/heic', bytes(0, 0, 0, 0x18, 'ftypheic')],
  ])('detects %s', (type, data) => {
    expect(detectImageType(data)).toBe(type);
  });

  it.each([
    ['an error text', new TextEncoder().encode('File not found')],
    ['an empty file', new Uint8Array()],
    ['a PDF', bytes('%PDF-1.7')],
  ])('rejects %s', (_label, data) => {
    expect(detectImageType(data)).toBeNull();
  });
});
