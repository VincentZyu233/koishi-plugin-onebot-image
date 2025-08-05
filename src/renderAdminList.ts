// renderAdminList.ts
import { Context } from 'koishi';
import { } from 'koishi-plugin-puppeteer'; // 引入 puppeteer 类型，但不直接使用 Puppeteer 类

import { IMAGE_STYLES, FONT_FILES, type ImageStyle, ImageType, UnifiedAdminInfo, UnifiedContextInfo } from './type';
import { generateTimestamp, getGroupAvatarBase64, getFontBase64 } from './utils';

// export const inject = {
//     required: ["puppeteer", "http"]
// }

const generateAdminListItems = (admins: UnifiedAdminInfo[]) => {
    return admins.map((admin, index) => `
        <div class="admin-item">
          <div class="admin-column-1">
            <div class="admin-number">${(index + 1).toString().padStart(2, '0')}</div>
            <div class="admin-avatar">
              <img src="${admin.avatar || `https://q1.qlogo.cn/g?b=qq&nk=${admin.user_id}&s=640`}" alt="头像" />
            </div>
          </div>
          <div class="admin-column-2">
            <div class="admin-name">${admin.nickname || '未知'}</div>
            <div class="admin-id"><span class="qq-label">QQ:</span> <span class="qq-number">${admin.user_id}</span></div>
          </div>
          <div class="admin-column-3">
            ${admin.card ? `<div class="admin-card"><span class="card-label">群昵称:</span><br><span class="card-content">${admin.card}</span></div>` : '<div class="admin-card-empty">无群昵称</div>'}
          </div>
          <div class="admin-role ${admin.role}">${admin.role === 'owner' ? '群  主' : '管理员'}</div>
        </div>
    `).join('');
};

const getSourceHanSerifSCStyleAdminListHtmlStr = async (admins: UnifiedAdminInfo[], contextInfo: UnifiedContextInfo, groupAvatarBase64: string, fontBase64: string, enableDarkMode: boolean) => {
    // 调整背景样式为 cover，并居中
    const backgroundStyle = groupAvatarBase64
        ? `background-image: radial-gradient(circle at center, rgba(255,255,255,0.15), rgba(0,0,0,0.1)), url(data:image/jpeg;base64,${groupAvatarBase64}); background-size: cover; background-position: center center; background-repeat: no-repeat;`
        : 'background: linear-gradient(135deg, #f8f9fa, #e9ecef);';

    // 生成当前时间戳
    const timestamp = generateTimestamp();

    return `<!DOCTYPE html>
<html>
<head>
    <style>
        ${fontBase64 ? `@font-face { font-family: 'SourceHanSerifSC-Medium'; src: url('data:font/opentype;charset=utf-8;base64,${fontBase64}') format('opentype'); font-weight: normal; font-style: normal; font-display: swap; }` : ''}

        html, body { margin: 0; padding: 0; width: 100%; height: auto; min-height: 100vh; }
        body {
            font-family: ${fontBase64 ? "'SourceHanSerifSC-Medium'," : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            width: 800px;
            height: auto;
            min-height: 100vh; /* 确保在内容少时也有足够的背景区域 */
            display: flex;
            align-items: center;
            justify-content: center;
            ${backgroundStyle}
            background-repeat: no-repeat;
            position: relative;
            box-sizing: border-box;
            overflow: visible; /* 移除溢出隐藏 */
            color: #333;
            padding: 25px; /* 增加body padding */
        }

        .card {
            width: 700px;
            height: auto;
            min-height: 400px; /* 可以设置一个最小高度 */
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.6);
            position: relative;
            overflow: visible; /* 移除溢出隐藏 */
            display: flex;
            flex-direction: column;
            padding: 32px;
            box-sizing: border-box;
        }

        .group-header { display: flex; align-items: center; margin-bottom: 20px; padding: 18px; background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.4); border-radius: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

        .group-avatar { width: 75px; height: 75px; border-radius: 50%; margin-right: 16px; border: 3px solid rgba(255,255,255,0.6); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

        .group-info { flex: 1; }

        .group-name { font-size: 30px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }

        .group-details { font-size: 20px; color: #4a4a4a; line-height: 1.3; font-weight: 500; }

        .title { font-size: 50px; font-weight: 700; margin-bottom: 16px; color: #1a1a1a; text-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }

        .admin-list { width: 100%; display: flex; flex-direction: column; gap: 8px; /* flex: 1; overflow-y: auto; */ } /* 移除 flex: 1 和 overflow-y: auto */

        .admin-item { background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.5); border-radius: 14px; padding: 16px; display: flex; align-items: center; box-shadow: 0 3px 10px rgba(0,0,0,0.08); transition: all 0.3s ease; backdrop-filter: blur(10px); min-height: 70px; }

        .admin-item:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.12); background: rgba(255,255,255,0.7); }

        .admin-column-1 { display: flex; flex-direction: row; align-items: center; margin-right: 15px; min-width: 60px; text-align: left; }

        .admin-avatar { margin-bottom: 4px; }

        .admin-avatar img { width: 90px; height: 90px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

        .admin-number { font-size: 25px; margin: 0 10px 0 0; font-weight: 700; color: #666; text-align: left; }

        .admin-column-2 { flex: 1; margin-right: 16px; text-align: left; }

        .admin-name { font-size: 20px; color: #1a1a1a; font-weight: 600; margin-bottom: 4px; text-align: left; }

        .admin-id { font-size: 15px; margin-bottom: 2px; text-align: left; }

        .qq-label { color: #666; font-weight: 500; }

        .qq-number { color: #1a1a1a; font-weight: 600; font-family: 'Courier New', monospace; }

        .admin-column-3 { flex: 1; margin-right: 16px; text-align: left; }

        .admin-card { font-size: 20px; line-height: 1.3; text-align: left; }

        .card-label { color: #666; font-weight: 500; font-size: 18px; }

        .card-content { color: #1a1a1a; font-weight: 600; font-size: 20px; }

        .admin-card-empty { font-size: 20px; color: #999; font-style: italic; text-align: left; }

        .admin-role { font-size: 20px; font-weight: 700; min-width: 60px; text-align: left; padding: 3px 6px; border-radius: 8px; }
        .admin-role.owner { color: #ff8c00; background: rgba(255,140,0,0.15); }
        .admin-role.admin { color: #007bff; background: rgba(0,123,255,0.1); }

        .timestamp-watermark { position: fixed; top: 1.3px; left: 1.3px; font-size: 13px; color: rgba(128, 128, 128, 0.6); font-family: 'Courier New', monospace; z-index: 9999; pointer-events: none; text-shadow: 0 0 2px rgba(255, 255, 255, 0.8); }

        body.dark { color: #e0e0e0; }
        body.dark .card { background: rgba(20,20,20,0.4); box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.15); }
        body.dark .group-header { background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.15); }
        body.dark .group-name { color: #ffffff; }
        body.dark .group-details { color: #b0b0b0; }
        body.dark .title { color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.4); }
        body.dark .admin-item { background: rgba(40,40,40,0.6); border-color: rgba(255,255,255,0.1); box-shadow: 0 3px 10px rgba(0,0,0,0.2); }
        body.dark .admin-item:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.3); background: rgba(50,50,50,0.7); }
        body.dark .admin-number { color: #a0a0a0; }
        body.dark .admin-name { color: #ffffff; }
        body.dark .qq-label { color: #b0b0b0; }
        body.dark .qq-number { color: #ffffff; }
        body.dark .card-label { color: #b0b0b0; }
        body.dark .card-content { color: #ffffff; }
        body.dark .admin-card-empty { color: #666; }
        body.dark .admin-role.owner { color: #ffa07a; background: rgba(255,160,122,0.2); }
        body.dark .admin-role.admin { color: #4da6ff; background: rgba(77,166,255,0.15); }
        body.dark .timestamp-watermark { color: rgba(160, 160, 160, 0.5); text-shadow: 0 0 2px rgba(0, 0, 0, 0.8); }
    </style>
</head>
<body class="${enableDarkMode ? 'dark' : ''}">
    <div class="card">
        <div class="group-header">
            <img src="data:image/jpeg;base64,${groupAvatarBase64}" alt="群头像" class="group-avatar" />
            <div class="group-info">
                <div class="group-name">${contextInfo.groupName || '未知群聊'}</div>
                <div class="group-details">
                    群号: ${contextInfo.groupId}<br>
                    成员数: ${contextInfo.memberCount}/${contextInfo.maxMemberCount}
                </div>
            </div>
        </div>
        <div class="title">群管理员列表 (${admins.length}人)</div>
        <div class="admin-list">
            ${generateAdminListItems(admins)}
        </div>
    </div>
    <div class="timestamp-watermark">${timestamp}</div>
</body>
</html>`;
};

const getLXGWWenKaiAdminListHtmlStr = async (admins: UnifiedAdminInfo[], contextInfo: UnifiedContextInfo, groupAvatarBase64: string, fontBase64: string, enableDarkMode: boolean) => {
    // 调整背景样式为 cover，并居中
    const backgroundStyle = groupAvatarBase64
        ? `background-image: linear-gradient(45deg, rgba(245,240,230,0.85), rgba(250,245,235,0.85)), url(data:image/jpeg;base64,${groupAvatarBase64}); background-size: cover; background-position: center center; background-repeat: no-repeat;`
        : `background: linear-gradient(45deg, #f5f0e6, #faf5eb);`;

    // 生成当前时间戳
    const timestamp = generateTimestamp();

    return `<!DOCTYPE html>
<html>
<head>
    <style>
        ${fontBase64 ? `@font-face { font-family: 'LXGWWenKai'; src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype'); font-weight: normal; font-style: normal; font-display: swap; }` : ''}

        html, body { margin: 0; padding: 0; width: 100%; /* height: 100%; */ }
        body {
            font-family: ${fontBase64 ? "'LXGWWenKai'," : ''} "SimSun", "FangSong", "KaiTi", serif;
            width: 800px;
            display: flex;
            align-items: center;
            justify-content: center;
            ${backgroundStyle}
            background-repeat: no-repeat;
            position: relative;
            box-sizing: border-box;
            /* overflow: hidden;  <-- 移除溢出隐藏 */
            color: #3a2f2a;
            min-height: 100vh; /* 确保在内容少时也有足够的背景区域 */
        }

        body::before { content: ''; position: absolute; top: 16px; left: 16px; right: 16px; bottom: 16px; border: 3px solid #d4af37; border-radius: 20px; background: linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(184,134,11,0.06) 50%, rgba(212,175,55,0.12) 100%); box-shadow: inset 0 0 25px rgba(212,175,55,0.35), 0 0 35px rgba(212,175,55,0.25); z-index: 1; }

        body::after { content: '◆'; position: absolute; top: 30px; left: 30px; font-size: 26px; color: #d4af37; z-index: 2; text-shadow: 0 0 12px rgba(212,175,55,0.6); }

        .corner-decoration { position: absolute; font-size: 26px; color: #d4af37; z-index: 2; text-shadow: 0 0 12px rgba(212,175,55,0.6); }
        .corner-decoration.top-right { top: 30px; right: 30px; }
        .corner-decoration.bottom-left { bottom: 30px; left: 30px; }
        .corner-decoration.bottom-right { bottom: 30px; right: 30px; }

        .main-container {
            width: 720px;
            min-height: 400px; /* 可以设置一个最小高度 */
            position: relative;
            z-index: 3;
            display: flex;
            flex-direction: column;
            padding: 32px 28px;
            box-sizing: border-box;
        }

        .group-header { display: flex; align-items: center; margin-bottom: 18px; padding: 16px; background: rgba(255,255,255,0.2); border: 1px solid rgba(212,175,55,0.4); border-radius: 16px; box-shadow: 0 4px 16px rgba(212,175,55,0.15); }

        .group-avatar { width: 64px; height: 64px; border-radius: 9%; margin-right: 14px; border: 3px solid #d4af37; box-shadow: 0 4px 12px rgba(212,175,55,0.3); }

        .group-info { flex: 1; }

        .group-name { font-size: 25px; font-weight: bold; color: #8b4513; margin-bottom: 4px; text-shadow: 1px 1px 2px rgba(139,69,19,0.2); }

        .group-details { font-size: 20px; color: #a0522d; line-height: 1.4; font-weight: 500; }

        .title-section { text-align: center; margin-bottom: 14px; }

        .main-title { font-size: 50px; font-weight: bold; color: #8b4513; margin-bottom: 6px; text-shadow: 2px 2px 4px rgba(139,69,19,0.3); letter-spacing: 2px; }

        .admin-list { width: 100%; display: flex; flex-direction: column; gap: 6px; /* flex: 1; overflow-y: auto; */ } /* 移除 flex: 1 和 overflow-y: auto */

        .admin-item { background: rgba(255,255,255,0.25); border: 1px solid rgba(212,175,55,0.4); border-radius: 12px; padding: 14px; display: flex; align-items: center; box-shadow: 0 3px 10px rgba(0,0,0,0.08); transition: all 0.3s ease; backdrop-filter: blur(5px); min-height: 65px; }

        .admin-item:hover { transform: translateY(-1px); box-shadow: 0 5px 18px rgba(212,175,55,0.25); background: rgba(255,255,255,0.3); }

        .admin-column-1 { display: flex; flex-direction: row; align-items: center; margin-right: 14px; min-width: 55px; text-align: left; }

        .admin-avatar { margin-bottom: 4px; }

        .admin-avatar img { width: 75px; height: 75px; border-radius: 50%; border: 2px solid #d4af37; box-shadow: 0 2px 6px rgba(212,175,55,0.2); }

        .admin-number { font-size: 36px; margin: 5px 15px 5px 5px; font-weight: bold; color: #8b4513; text-align: left; }

        .admin-column-2 { flex: 1; margin-right: 10px; text-align: left; }

        .admin-name { font-size: 18px; color: #3a2f2a; font-weight: bold; margin-bottom: 3px; text-align: left; }

        .admin-id { font-size: 15px; margin-bottom: 2px; text-align: left; }

        .qq-label { color: #a0522d; font-weight: 500; }

        .qq-number { color: #3a2f2a; font-weight: bold; font-family: 'Courier New', monospace; }

        .admin-column-3 { flex: 1; margin-right: 10px; text-align: left; }

        .admin-card { font-size: 15px; line-height: 1.3; text-align: left; }

        .card-label { color: #a0522d; font-weight: 500; font-size: 13px; }

        .card-content { color: #3a2f2a; font-weight: bold; font-size: 15px; }

        .admin-card-empty { font-size: 15px; color: #8b7355; font-style: italic; text-align: left; }

        .admin-role { font-size: 20px; color: #8b4513; font-weight: bold; min-width: 50px; text-align: left; padding: 2px 5px; background: rgba(212,175,55,0.15); border-radius: 6px; border: 1px solid rgba(212,175,55,0.3); }

        .timestamp-watermark { position: fixed; top: 1.3px; left: 1.3px; font-size: 13px; color: rgba(139, 69, 19, 0.4); font-family: 'Courier New', monospace; z-index: 9999; pointer-events: none; text-shadow: 0 0 2px rgba(255, 255, 255, 0.8); }

        body.dark { background: linear-gradient(45deg, #2c2416, #3a2f1f); color: #e6d7c3; }
        body.dark::before { border-color: #b8860b; background: linear-gradient(135deg, rgba(184,134,11,0.18) 0%, rgba(139,69,19,0.12) 50%, rgba(184,134,11,0.18) 100%); box-shadow: inset 0 0 25px rgba(184,134,11,0.45), 0 0 35px rgba(184,134,11,0.35); }
        body.dark .group-header { background: rgba(0,0,0,0.3); border-color: rgba(184,134,11,0.5); }
        body.dark .group-name { color: #daa520; text-shadow: 1px 1px 2px rgba(218,165,32,0.3); }
        body.dark .group-details { color: #cd853f; }
        body.dark .main-title { color: #daa520; text-shadow: 2px 2px 4px rgba(218,165,32,0.4); }
        body.dark .admin-item { background: rgba(0,0,0,0.35); border-color: rgba(184,134,11,0.5); }
        body.dark .admin-item:hover { box-shadow: 0 5px 18px rgba(184,134,11,0.35); background: rgba(0,0,0,0.4); }
        body.dark .admin-number { color: #daa520; }
        body.dark .admin-name { color: #e6d7c3; }
        body.dark .qq-label { color: #cd853f; }
        body.dark .qq-number { color: #e6d7c3; }
        body.dark .card-label { color: #cd853f; }
        body.dark .card-content { color: #e6d7c3; }
        body.dark .admin-card-empty { color: #8b7355; }
        body.dark .admin-role { color: #daa520; background: rgba(184,134,11,0.2); border-color: rgba(184,134,11,0.4); }
        body.dark .timestamp-watermark { color: rgba(218, 165, 32, 0.4); text-shadow: 0 0 2px rgba(0, 0, 0, 0.8); }
    </style>
</head>
<body class="${enableDarkMode ? 'dark' : ''}">
    <div class="corner-decoration top-right">◆</div>
    <div class="corner-decoration bottom-left">◆</div>
    <div class="corner-decoration bottom-right">◆</div>
    <div class="main-container">
        <div class="group-header">
            <img src="data:image/jpeg;base64,${groupAvatarBase64}" alt="群头像" class="group-avatar" />
            <div class="group-info">
                <div class="group-name">${contextInfo.groupName || '未知群聊'}</div>
                <div class="group-details">
                    群号: ${contextInfo.groupId} | 成员: ${contextInfo.memberCount}/${contextInfo.maxMemberCount}
                </div>
            </div>
        </div>
        <div class="title-section">
            <div class="main-title">「 群管理员列表 (${admins.length}人) 」</div>
        </div>
        <div class="admin-list">
            ${generateAdminListItems(admins)}
        </div>
    </div>
    <div class="timestamp-watermark">${timestamp}</div>
</body>
</html>`;
};

// 主渲染函数
export async function renderAdminList(
    ctx: Context,
    admins: UnifiedAdminInfo[],
    contextInfo: UnifiedContextInfo,
    imageStyle: ImageStyle,
    enableDarkMode: boolean,
    imageType: ImageType,
    screenshotQuality: number,
): Promise<string> {
    // 排序管理员列表：群主排在第一位，其余管理员按群昵称（若无则按用户名）的字典序升序排列
    admins.sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        const nameA = a.card || a.nickname;
        const nameB = b.card || b.nickname;
        return nameA.localeCompare(nameB, 'zh-Hans-CN', { sensitivity: 'base' });
    });
    try {
        // 获取群头像
        const groupAvatarBase64 = contextInfo.groupId
            ? await getGroupAvatarBase64(ctx, contextInfo.groupId.toString())
            : '';

        // 获取字体文件
        const fontBase64 = await getFontBase64(ctx, imageStyle);

        // 根据样式选择对应的 HTML 生成函数
        let htmlContent: string;
        if (imageStyle === IMAGE_STYLES.SOURCE_HAN_SERIF_SC) {
            htmlContent = await getSourceHanSerifSCStyleAdminListHtmlStr(
                admins,
                contextInfo,
                groupAvatarBase64,
                fontBase64,
                enableDarkMode
            );
        } else if (imageStyle === IMAGE_STYLES.LXGW_WENKAI) {
            htmlContent = await getLXGWWenKaiAdminListHtmlStr(
                admins,
                contextInfo,
                groupAvatarBase64,
                fontBase64,
                enableDarkMode
            );
        } else {
            throw new Error(`不支持的图片样式: ${imageStyle}`);
        }

        // 使用 Puppeteer 渲染 HTML 为图片
        const page = await ctx.puppeteer.page();
        await page.setContent(htmlContent);

        // 等待页面完全加载，特别是图片和字体
        await page.waitForSelector('body', { timeout: 5000 });
        // 等待所有图片加载完成，防止截图时图片还没显示
        await page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            return Promise.all(images.filter(img => !img.complete).map(img => new Promise(resolve => {
                img.onload = img.onerror = resolve;
            })));
        });

        // 获取body元素的边界框
        const bodyElement = await page.$('body');
        // 使用element.evaluateHandle和element.getProperty来获取实际的scrollHeight和scrollWidth
        const boundingBox = await bodyElement.boundingBox();

        // 截取body元素的精确区域，避免白边
        const screenshotBuffer = await page.screenshot({
            encoding: 'base64',
            type: 'png',
            clip: {
                x: boundingBox.x,
                y: boundingBox.y,
                width: boundingBox.width,
                height: boundingBox.height
            }
        });

        await page.close();

        return screenshotBuffer;
    } catch (error) {
        ctx.logger.error(`渲染管理员列表图片失败: ${error}`);
        throw error;
    }
}