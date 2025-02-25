const bigJson = require('big-json');
import { Readable } from 'stream';

import type {
  Node as FigmaDocumentNode,
  RGBA,
} from "@figma/rest-api-spec";

export interface ColorValue {
  hex: string;
  opacity: number;
}

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
  // 如果不是对象类型或为null,直接返回
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  // 处理数组类型
  if (Array.isArray(input)) {
    return input.map(item => removeEmptyKeys(item)) as T;
  }

  // 处理对象类型
  const result = {} as T;
  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key];
      
      // 递归处理嵌套对象
      const cleanedValue = removeEmptyKeys(value);
      
      // 跳过空数组和空对象
      if (
        cleanedValue !== undefined && 
        !(Array.isArray(cleanedValue) && cleanedValue.length === 0) &&
        !(typeof cleanedValue === 'object' && 
          cleanedValue !== null && 
          Object.keys(cleanedValue).length === 0)
      ) {
        result[key] = cleanedValue;
      }
    }
  }

  return result;
}

/**
 * 将hex颜色值和opacity转换为rgba格式
 * @param hex - 十六进制颜色值 (例如: "#FF0000" 或 "#F00")
 * @param opacity - 透明度值 (0-1)
 * @returns rgba格式的颜色字符串
 */
export function hexToRgba(hex: string, opacity: number = 1): string {
  // 移除可能存在的 # 前缀
  hex = hex.replace('#', '');
  
  // 处理简写的hex值 (例如 #FFF)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // 将hex转换为RGB值
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // 确保opacity在0-1范围内
  const validOpacity = Math.min(Math.max(opacity, 0), 1);
  
  return `rgba(${r}, ${g}, ${b}, ${validOpacity})`;
}

/**
 * Convert color from RGBA to { hex, opacity }
 *
 * @param color - The color to convert, including alpha channel
 * @param opacity - The opacity of the color, if not included in alpha channel
 * @returns The converted color
 **/
export function convertColor(color: RGBA, opacity = 1): ColorValue {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  // Alpha channel defaults to 1. If opacity and alpha are both and < 1, their effects are multiplicative
  const a = Math.round(opacity * color.a * 100) / 100;

  const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();

  return { hex, opacity: a };
}

/**
 * Convert color from RGBA to { hex, opacity }
 *
 * @param color - The color to convert, including alpha channel
 * @param opacity - The opacity of the color, if not included in alpha channel
 * @returns The converted color
 **/
export function formatRGBAColor(color: RGBA, opacity = 1): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  // Alpha channel defaults to 1. If opacity and alpha are both and < 1, their effects are multiplicative
  const a = Math.round(opacity * color.a * 100) / 100;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * 生成6位随机变量ID
 * @param prefix - ID前缀
 * @returns 带前缀的6位随机ID字符串
 */
export function generateVarId(prefix: string = 'var'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  
  return `${prefix}_${result}`;
}

