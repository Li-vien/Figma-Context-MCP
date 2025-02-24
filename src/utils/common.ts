const bigJson = require('big-json');
import { Readable } from 'stream';

/**
 * 将大型对象转换为 JSON 字符串。
 * @param file - 需要转换的对象。
 * @returns 返回一个 Promise，解析为 JSON 字符串。
 * @throws 如果转换失败，抛出错误。
 */
export async function stringify<T>(file: T): Promise<string> {
  try {
    const stringifyStream = bigJson.createStringifyStream({
      body: file,
    });

    const readableStream = Readable.from(stringifyStream);
    const chunks: Buffer[] = [];

    for await (const chunk of readableStream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString('utf8');
  } catch (error) {
    throw new Error(`Failed to stringify file`);
  }
}


/**
 * 解析大型 JSON 字符串为对象。
 * @param jsonString - 需要解析的 JSON 字符串。
 * @returns 返回一个 Promise，解析为解析后的对象。
 * @throws 如果解析失败，抛出错误。
 */
export async function parse<T>(jsonString: string): Promise<T> {
  try {
    const parseStream = bigJson.createParseStream();

    const readableStream = Readable.from(jsonString);
    let parsedData: T;

    // 将数据通过管道传输到解析流
    readableStream.pipe(parseStream);

    return new Promise((resolve, reject) => {
      parseStream.on('data', (data: T) => {
        parsedData = data;
      });

      parseStream.on('end', () => {
        resolve(parsedData);
      });

      parseStream.on('error', (error: Error) => {
        reject(error);
      });
    });
  } catch (error) {
    throw new Error(`Failed to parse JSON`);
  }
}

/**
 * 移除对象中值为空数组或空对象的键。
 * @param input - 输入的对象或值。
 * @returns 返回处理后的对象或原样返回的值。
 */
export function removeEmptyKeys<T>(input: T): T {
  // 如果不是对象或数组，直接返回
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return input;
  }
  // 如果是对象，递归处理每个属性
  const result: Record<string, any> = {};
  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key];
      const cleanedValue = removeEmptyKeys(value);

      // 如果值是空数组或空对象，跳过该键
      if (
        !(
          cleanedValue === undefined ||
          (Array.isArray(cleanedValue) && cleanedValue.length === 0) ||
          (typeof cleanedValue === 'object' &&
            cleanedValue !== null &&
            Object.keys(cleanedValue).length === 0)
        )
      ) {
        result[key] = cleanedValue;
      }
    }
  }
  console.log(result)
  return result as T;
}