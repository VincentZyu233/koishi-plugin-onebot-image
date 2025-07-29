import { Context } from 'koishi';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FONT_FILES, type ImageStyle } from './constants';


/**
 * 生成当前时间戳字符串
 * @returns 格式为 YYYY/MM/DD HH:MM:SS 的时间戳字符串
 */
export function generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}



/**
 * 获取群头像的 Base64 编码
 * @param ctx Koishi Context 实例
 * @param groupId 群号
 * @returns Promise<string> 群头像的 base64 编码
 */
export async function getGroupAvatarBase64(ctx: Context, groupId: string): Promise<string> {
    try {
        const groupAvatarUrl = `https://p.qlogo.cn/gh/${groupId}/${groupId}/640/`;
        const response = await ctx.http.get(groupAvatarUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response).toString('base64');
    } catch (error) {
        ctx.logger.warn(`获取群头像失败: ${error.message}`);
        return '';
    }
}

/**
 * 获取字体文件的 Base64 编码
 * @param ctx Koishi Context 实例
 * @param imageStyle 图片样式
 * @returns Promise<string> 字体文件的 base64 编码
 */
export async function getFontBase64(ctx: Context, imageStyle: ImageStyle): Promise<string> {
    try {
        const fontFileName = FONT_FILES[imageStyle];
        const fontPath = join(__dirname, '..', 'assets', fontFileName);
        const fontBuffer = readFileSync(fontPath);
        return fontBuffer.toString('base64');
    } catch (error) {
        ctx.logger.warn(`获取字体文件失败: ${error.message}`);
        return '';
    }
}