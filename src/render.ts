// render.ts
import { Context } from 'koishi';
import { } from 'koishi-plugin-puppeteer'; // 引入 puppeteer 类型，但不直接使用 Puppeteer 类

export const inject = {
    required: ["puppeteer", "http"]
}

const getUserInfoHtmlStr = async (userInfo, contextInfo, avatarBase64: string, groupAvatarBase64: string, fontBase64: string, enableDarkMode: boolean) => {
    // 确保 avatarBase64 不为空，否则会影响背景图
    const backgroundStyle = avatarBase64
        ? `background-image: url(data:image/jpeg;base64,${avatarBase64});`
        : `background-color: #f0f2f5;`; // 提供一个 fallback 背景色

    // 根据是否为群聊生成不同的信息项
    const generateInfoItems = () => {
        let items = [];

        // 右上角固定的四个区域：昵称、性别、年龄、QQ等级
        items.push(`
            <div class="info-item">
                <div class="info-label">昵称</div>
                <div class="info-value">${userInfo.nickname || '未知昵称'}</div>
            </div>
        `);

        items.push(`
            <div class="info-item">
                <div class="info-label">性别</div>
                <div class="info-value">${userInfo.sex === 'male' ? '男' : userInfo.sex === 'female' ? '女' : '未知'}</div>
            </div>
        `);

        items.push(`
            <div class="info-item">
                <div class="info-label">年龄</div>
                <div class="info-value">${userInfo.age || '未知'}</div>
            </div>
        `);

        items.push(`
            <div class="info-item">
                <div class="info-label">QQ等级</div>
                <div class="info-value">${userInfo.level || '未知'}</div>
            </div>
        `);

        // 如果是群聊且有群名片，则添加群名片信息
        if (contextInfo.isGroup && userInfo.card) {
            items.push(`
                <div class="info-item full-width">
                    <div class="info-label">群名片</div>
                    <div class="info-value">${userInfo.card}</div>
                </div>
            `);
        }

        // 其他信息项
        if (userInfo.sign) {
            items.push(`
                <div class="info-item full-width">
                    <div class="info-label">个性签名</div>
                    <div class="info-value">${userInfo.sign}</div>
                </div>
            `);
        }

        // QQ相关信息 - 检查多种可能的QQ号字段
        if (userInfo.q_id || userInfo.user_id || userInfo.qq || userInfo.uin) {
            const qqId = userInfo.q_id || userInfo.user_id || userInfo.qq || userInfo.uin;
            items.push(`
                <div class="info-item">
                    <div class="info-label">QQ号</div>
                    <div class="info-value">${qqId}</div>
                </div>
            `);
        }

        if (userInfo.RegisterTime) {
            items.push(`
                <div class="info-item">
                    <div class="info-label">注册时间</div>
                    <div class="info-value">${new Date(userInfo.RegisterTime).toLocaleString('zh-CN')}</div>
                </div>
            `);
        }

        if (userInfo.status && userInfo.status.message) {
            items.push(`
                <div class="info-item full-width">
                    <div class="info-label">状态</div>
                    <div class="info-value">${userInfo.status.message}</div>
                </div>
            `);
        }

        return items.join('');
    };

    const generateGroupSpecificItems = () => {
        let groupItems = [];

        if (contextInfo.isGroup) {
            // 群等级和群角色形成两列布局
            if (userInfo.group_level || userInfo.role) {
                groupItems.push(`
                    <div class="group-level-role-row">
                        <div class="info-item group-level-item">
                            <div class="info-label">群等级</div>
                            <div class="info-value">${userInfo.group_level || '未知'}</div>
                        </div>
                        <div class="info-item group-role-item">
                            <div class="info-label">群角色</div>
                            <div class="info-value">${userInfo.role === 'owner' ? '群主Owner' : userInfo.role === 'admin' ? '管理员Admin' : userInfo.role === 'member' ? '成员Member' : '未知'}</div>
                        </div>
                    </div>
                `);
            }

            if (userInfo.title) {
                groupItems.push(`
                    <div class="info-item full-width">
                        <div class="info-label">专属头衔</div>
                        <div class="info-value">${userInfo.title}</div>
                    </div>
                `);
            }

            // 处理时间信息 - 将加群时间和最后发言时间分成两行显示
            const hasJoinTime = userInfo.join_time;
            const hasLastTime = userInfo.last_sent_time || userInfo.lastSentTime || userInfo.last_speak_time;
            
            if (hasJoinTime) {
                groupItems.push(`
                    <div class="info-item full-width time-item-row">
                        <div class="info-label">加群时间</div>
                        <div class="info-value">${new Date(userInfo.join_time * 1000).toLocaleString('zh-CN')}</div>
                    </div>
                `);
            }
            
            if (hasLastTime) {
                const lastTime = userInfo.last_sent_time || userInfo.lastSentTime || userInfo.last_speak_time;
                groupItems.push(`
                    <div class="info-item full-width time-item-row">
                        <div class="info-label">最后发言</div>
                        <div class="info-value">${new Date(lastTime * 1000).toLocaleString('zh-CN')}</div>
                    </div>
                `);
            }
        }
        return groupItems.join('');
    };


    return `<!DOCTYPE html>
<html>
<head>
    <style>
        ${fontBase64 ? `
        @font-face {
            font-family: 'MiSans';
            src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }
        ` : ''}
        
        body {
            font-family: ${fontBase64 ? "'MiSans'," : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            margin: 0;
            padding: 0;
            width: 999px; 
            height: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            ${backgroundStyle}
            background-size: cover;
            background-position: center center;
            background-repeat: no-repeat;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.01); /* 更加透明的背景 */
            backdrop-filter: blur(9px) saturate(130%);
            -webkit-backdrop-filter: blur(9px) saturate(130%);
            border-radius: 32px;
            box-shadow: 
                0 16px 48px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.25), /* 更透明的边框 */
                inset 0 2px 0 rgba(255, 255, 255, 0.4); /* 更透明的内阴影 */
            padding: 40px;
            width: 920px; /* 固定宽度，四周留约40px空隙 */
            height: 920px; /* 固定高度，四周留约40px空隙 */
            box-sizing: border-box;
            border: 1px solid rgba(255, 255, 255, 0.3); /* 更透明的边框 */
            color: #212121;
            position: relative;
            z-index: 2;
            display: flex;
        }
        
        /* 卡片内容布局 */
        .card-content {
            display: flex;
            width: 100%;
            height: 100%;
        }
        
        /* 左侧用户信息区域 */
        .user-profile {
            flex: 0 0 320px; /* 黄金分割比：320px (约0.618) */
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding-right: 25px;
            border-right: 1px solid rgba(255, 255, 255, 0.3);
            position: relative;
            justify-content: space-between;
            padding-bottom: 20px;
        }
        
        .avatar-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 15px;
        }

        .avatar {
            width: 270px; /* 进一步增大头像尺寸 */
            height: 270px;
            border-radius: 50%;
            object-fit: cover;
            margin-bottom: 20px;
            border: 5px solid rgba(255, 255, 255, 0.8);
            box-shadow: 
                0 12px 28px rgba(0, 0, 0, 0.35),
                0 0 0 3px rgba(255, 255, 255, 0.3);
            transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        
        .avatar:hover {
            transform: scale(1.08);
        }
        
        .nickname {
            font-size: 36px; /* 进一步增大用户名字体 */
            font-weight: 800;
            margin-bottom: 12px;
            color: #111;
            word-break: break-word;
            text-shadow: 0 3px 6px rgba(255, 255, 255, 0.7);
            background: rgba(255, 255, 255, 0.25);
            padding: 14px 28px; /* 增大内边距 */
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.5);
            letter-spacing: 0.5px;
        }
        
        .userid {
            font-size: 20px; /* 进一步增大ID字体 */
            color: #555;
            background: rgba(255, 255, 255, 0.4);
            padding: 12px 20px; /* 增大内边距 */
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.6);
            margin-bottom: 20px;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
        }
        
        /* 群信息区域 - 调整为在user-profile内部布局 */
        .group-info-container {
            width: 100%;
            padding: 10px 10px; /* 减少上下内边距，让红框区域往上提 */
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px; /* 减少间距，让红框区域往上提 */
            background: rgba(255, 255, 255, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.3);
            border-bottom-left-radius: 28px;
            border-bottom-right-radius: 0;
            box-sizing: border-box;
            min-height: 160px; /* 减少最小高度 */
        }

        .group-info-container .info-item {
            width: 100%;
            box-sizing: border-box;
            padding: 3px 6px; /* 进一步减小群信息项的内边距，让高度更窄 */
        }
        
        /* 群信息项中的标签间距也要相应调整 */
        .group-info-container .info-label {
            margin-bottom: 2px; /* 减小群信息项中标签的下边距 */
        }
        
        /* 群等级和群角色两列布局 */
        .group-level-role-row {
            display: flex;
            gap: 8px;
            width: 100%;
            margin-bottom: 6px; /* 减少下边距 */
        }
        
        .group-level-item,
        .group-role-item {
            flex: 1;
            margin: 0;
        }
        
        .group-avatar-wrapper {
            display: flex;
            align-items: center;
            gap: 12px; /* 减小间距 */
            margin-bottom: 6px; /* 减少下边距，让红框区域往上提 */
        }
        
        /* 时间项行样式 - 单行显示 */
        .time-item-row {
            margin-bottom: 4px; /* 减少时间行之间的间距 */
        }

        .group-avatar {
            width: 69px; /* 增大群头像尺寸 */
            height: 69px;
            border-radius: 10px; /* 增大圆角 */
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .group-id {
            font-size: 18px; /* 增大群号字体 */
            color: #444;
            background: rgba(255, 255, 255, 0.5);
            padding: 6px 12px; /* 增大内边距 */
            border-radius: 10px; /* 增大圆角 */
            border: 1px solid rgba(255, 255, 255, 0.5);
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
        }
        
        /* 右侧信息区域 */
        .info-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 30px;
            padding-left: 35px; /* 稍微减小左边距以适应新比例 */
        }
        
        .info-title {
            font-size: 40px; /* 增大标题字体 */
            font-weight: 700;
            color: #111;
            margin-bottom: 20px;
            text-align: center;
            position: relative;
            background: rgba(255, 255, 255, 0.25);
            padding: 16px 32px; /* 增大内边距 */
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.5);
            text-shadow: 0 3px 6px rgba(255, 255, 255, 0.7);
        }
        
        .info-title::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 4px;
            background: linear-gradient(90deg, transparent, #3498db, transparent);
            border-radius: 2px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px 25px;
            flex-grow: 1;
            align-content: start;
        }
        
        .info-item {
            background: rgba(255, 255, 255, 0.4);
            border-radius: 16px;
            padding: 13px 18px; /* 减小内边距以降低高度 */
            border: 1px solid rgba(255, 255, 255, 0.5);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .info-item.full-width {
            grid-column: 1 / -1;
        }

        .info-label {
            font-size: 18px; /* 增大标签字体 */
            font-weight: 450;
            color: #666;
            margin-bottom: 6px; /* 减小间距以配合减小的高度 */
            text-transform: uppercase;
            letter-spacing: 0.8px;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
        }
        
        .info-value {
            font-size: 20px; /* 增大值字体 */
            font-weight: 500;
            color:rgb(3, 3, 3);
            word-break: break-all;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
            line-height: 1.4;
        }
        
        /* Dark Mode */
        body.dark .card {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.25);
            color: #e0e0e0;
            box-shadow: 
                0 16px 48px rgba(0, 0, 0, 0.7),
                0 0 0 1px rgba(255, 255, 255, 0.2),
                inset 0 2px 0 rgba(255, 255, 255, 0.35);
        }
        
        body.dark .nickname {
            color: #ffffff;
            text-shadow: 0 3px 6px rgba(0, 0, 0, 0.8);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        body.dark .userid {
            color: #cccccc;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        }
        
        body.dark .group-info-container {
            background: rgba(0, 0, 0, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        body.dark .group-id {
            color: #cccccc;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        }
        
        body.dark .info-title {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            text-shadow: 0 3px 6px rgba(0, 0, 0, 0.8);
        }
        
        body.dark .info-item {
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        
        body.dark .info-item:hover {
            background: rgba(255, 255, 255, 0.25);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
        }
        
        body.dark .info-label {
            color: #a0a0a0;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
        }
        
        body.dark .info-value {
            color: #e0e0e0;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        }
        
        body.dark .avatar {
            border: 5px solid rgba(255, 255, 255, 0.5);
            box-shadow: 
                0 12px 28px rgba(0, 0, 0, 0.6),
                0 0 0 3px rgba(255, 255, 255, 0.2);
        }
        
        body.dark .group-avatar {
            border: 2px solid rgba(255, 255, 255, 0.5); /* 适应新的45px尺寸 */
        }
    </style>
</head>
<body class="${enableDarkMode ? 'dark' : ''}">
    <div class="card">
        <div class="card-content">
            <div class="user-profile">
                <div class="avatar-section">
                    ${avatarBase64 ? `<img class="avatar" src="data:image/jpeg;base64,${avatarBase64}" alt="User Avatar">` : ''}
                    <div class="nickname">${userInfo.nickname || '未知昵称'}</div>
                    <div class="userid">ID: ${userInfo.user_id}</div>
                </div>
                ${contextInfo.isGroup ? `
                    <div class="group-info-container">
                        <div class="group-avatar-wrapper">
                            ${groupAvatarBase64 ? `<img class="group-avatar" src="data:image/jpeg;base64,${groupAvatarBase64}" alt="Group Avatar">` : ''}
                            <div class="group-id">群号: ${contextInfo.groupId}</div>
                        </div>
                        <div style="width: 100%; padding: 0 15px;"> 
                            ${generateGroupSpecificItems()}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="info-container">
                <div class="info-title">${contextInfo.isGroup ? '成员详细信息' : '用户信息'}</div>
                <div class="info-grid">
                    ${generateInfoItems()}
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
};

/**
 * 渲染用户信息为图片并返回 base64 编码。
 * @param ctx Koishi Context 实例
 * @param userInfo OneBot GroupMemberInfo 对象
 * @param avatarUrl 用户的头像 URL
 * @param enableDarkMode 是否启用暗黑模式
 * @returns Promise<string> 图片的 base64 编码
 */
export async function renderUserInfo(ctx: Context, userInfo, contextInfo, enableDarkMode: boolean = false): Promise<string> {
    const browserPage = await ctx.puppeteer.page();
    let avatarBase64: string | undefined;
    let groupAvatarBase64: string | undefined;
    let fontBase64: string | undefined;

    try {
        // 读取字体文件并转换为base64
        try {
            const fs = require('fs');
            const path = require('path');
            const fontPath = path.join(__dirname, '../assets/MiSansL3.ttf');
            const fontBuffer = fs.readFileSync(fontPath);
            fontBase64 = fontBuffer.toString('base64');
        } catch (error) {
            ctx.logger.warn(`Failed to load font file: ${error.message}`);
            fontBase64 = undefined;
        }

        // 获取用户头像
        if (userInfo.avatar) {
            try {
                const avatarBuffer = await ctx.http.file(userInfo.avatar);
                avatarBase64 = Buffer.from(avatarBuffer.data).toString('base64');
            } catch (error) {
                ctx.logger.warn(`Failed to fetch user avatar from ${userInfo.avatar}: ${error.message}`);
                avatarBase64 = undefined; // 获取失败则不使用头像
            }
        }

        // 获取群头像（如果是群聊）
        if (contextInfo.isGroup && contextInfo.groupAvatarUrl) {
            try {
                const groupAvatarBuffer = await ctx.http.file(contextInfo.groupAvatarUrl);
                groupAvatarBase64 = Buffer.from(groupAvatarBuffer.data).toString('base64');
            } catch (error) {
                ctx.logger.warn(`Failed to fetch group avatar from ${contextInfo.groupAvatarUrl}: ${error.message}`);
                groupAvatarBase64 = undefined;
            }
        }

        // 如果头像获取失败，可以使用一个默认的头像 base64
        if (!avatarBase64) {
            ctx.logger.info('Using empty avatarBase64 or fallback for background.');
        }

        const htmlContent = await getUserInfoHtmlStr(userInfo, contextInfo, avatarBase64 || '', groupAvatarBase64 || '', fontBase64 || '', enableDarkMode);

        // 设置页面视口为999x999
        await browserPage.setViewport({
            width: 999,
            height: 999,
            deviceScaleFactor: 1,
        });

        await browserPage.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // 等待图片加载完成（如果 avatar 是远程图片）
        await browserPage.evaluate(async () => {
            const images = Array.from(document.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return;
                return new Promise((resolve, reject) => {
                    img.addEventListener('load', resolve);
                    img.addEventListener('error', reject);
                });
            }));
        });

        // 截图指定尺寸的区域，确保是正方形
        const screenshotBuffer = await browserPage.screenshot({
            encoding: 'base64',
            type: 'png',
            clip: {
                x: 0,
                y: 0,
                width: 999,
                height: 999
            }
        });

        return screenshotBuffer;

    } catch (error) {
        ctx.logger.error(`Error rendering user info image: ${error}`);
        throw new Error(`Failed to render user info image: ${error.message}`);
    } finally {
        await browserPage.close(); // 确保关闭页面，释放资源
    }
}