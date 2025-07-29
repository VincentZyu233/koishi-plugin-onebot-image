// render.ts
import { Context } from 'koishi';
import { } from 'koishi-plugin-puppeteer'; // 引入 puppeteer 类型，但不直接使用 Puppeteer 类

import { IMAGE_STYLES, FONT_FILES, type ImageStyle, ImageType } from './constants';
import { generateTimestamp, getGroupAvatarBase64, getFontBase64 } from './utils';
import { ContextInfo } from './renderAdminList';
import { GroupMemberInfo } from 'koishi-plugin-adapter-onebot/lib/types';

export const inject = {
    required: ["puppeteer", "http"]
}

const getSourceHanSerifSCStyleUserInfoHtmlStr = async (userInfo, contextInfo, avatarBase64: string, groupAvatarBase64: string, fontBase64: string, enableDarkMode: boolean) => {
    // 确保 avatarBase64 不为空，否则会影响背景图
    const backgroundStyle = avatarBase64
        ? `background-image: url(data:image/jpeg;base64,${avatarBase64});`
        : `background-color: #f0f2f5;`; // 提供一个 fallback 背景色

    // 生成当前时间戳
    const timestamp = generateTimestamp();

        
    // 根据是否为群聊生成不同的信息项
    const generateInfoItems = (userInfo, contextInfo) => {
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

    const generateGroupSpecificItems = (userInfo, contextInfo) => {
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
            font-family: 'SourceHanSerifSC-Medium';
            src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }
        ` : ''}
        
        body {
            font-family: ${fontBase64 ? "'SourceHanSerifSC-Medium'," : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
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
            background: rgba(255, 255, 255, 0.13); /* 更加透明的背景 */
            backdrop-filter: blur(13px) saturate(130%);
            -webkit-backdrop-filter: blur(13px) saturate(130%);
            border-radius: 32px;
            box-shadow: 
                0 16px 48px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.25), /* 更透明的边框 */
                inset 0 2px 0 rgba(255, 255, 255, 0.4); /* 更透明的内阴影 */
            padding: 40px;
            width: 920px;   /* 固定宽度，四周留约40px空隙 */
            height: 920px;  /* 固定高度，四周留约40px空隙 */
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
        
        .timestamp-watermark {
            position: fixed;
            top: 1.3px;
            left: 1.3px;
            font-size: 13px;
            color: rgba(128, 128, 128, 0.6);
            font-family: 'Courier New', monospace;
            z-index: 9999;
            pointer-events: none;
            text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
        }
        
        /* Dark Mode */
        body.dark .card {
            background: rgba(0, 0, 0, 0.7); /* 更深的透明背景 */
            backdrop-filter: blur(15px) saturate(180%);
            -webkit-backdrop-filter: blur(15px) saturate(180%);
            border: 1px solid rgba(70, 70, 70, 0.6); /* 深灰色边框 */
            color: #f0f0f0;
            box-shadow: 
                0 20px 60px rgba(0, 0, 0, 0.95),
                0 0 0 1px rgba(70, 70, 70, 0.4),
                inset 0 3px 0 rgba(120, 120, 120, 0.5);
        }
        
        body.dark .user-profile {
            border-right: 2px solid #444; /* 深灰色分割线 */
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(60, 60, 60, 0.2)); /* 深色渐变 */
        }
        
        body.dark .avatar {
            border: 6px solid #555; /* 深灰色边框 */
            box-shadow: 
                0 18px 40px rgba(0, 0, 0, 0.7),
                0 0 0 3px rgba(220, 220, 220, 0.9),
                inset 0 0 25px rgba(0, 0, 0, 0.3);
        }
        
        body.dark .nickname {
            color: #f0f0f0;
            text-shadow: 0 3px 5px rgba(0, 0, 0, 0.9);
            background: linear-gradient(135deg, rgba(50, 50, 50, 0.8), rgba(30, 30, 30, 0.7)); /* 更深的透明渐变背景 */
            border: 2px solid rgba(120, 120, 120, 0.4);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
        }
        
        body.dark .userid {
            color: #ccc; /* 浅灰色文字 */
            background: rgba(70, 70, 70, 0.8); /* 更深的透明半透明背景 */
            border: 2px solid #888; /* 中灰色边框 */
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
        }
        
        body.dark .group-info-container {
            background: linear-gradient(135deg, rgba(50, 50, 50, 0.8), rgba(30, 30, 30, 0.7)); /* 更深的透明渐变背景 */
            border-top: 2px solid #555; /* 深灰色分割线 */
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }
        
        body.dark .group-avatar {
            border: 3px solid #666; /* 深灰色边框 */
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
        }
        
        body.dark .group-id {
            color: #ddd; /* 浅灰色文字 */
            background: rgba(70, 70, 70, 0.8); /* 更深的透明半透明背景 */
            border: 2px solid #888; /* 中灰色边框 */
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        }
        
        body.dark .info-title {
            background: linear-gradient(135deg, rgba(50, 50, 50, 0.8), rgba(30, 30, 30, 0.7)); /* 更深的透明渐变背景 */
            color: #f0f0f0;
            text-shadow: 0 3px 5px rgba(0, 0, 0, 0.9);
            border-bottom: 3px solid #aaa; /* 灰色点缀下划线 */
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
        }
        
        body.dark .info-item {
            background: rgba(70, 70, 70, 0.85); /* 增加透明度，更暗 */
            border: 2px solid #888; /* 深灰色边框 */
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
        }
        
        body.dark .info-item:hover {
            background: rgba(90, 90, 90, 0.98); /* 悬停时背景变深 */
            border-color: #777; /* 悬停时边框变深 */
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.7);
        }
        
        body.dark .info-label {
            color: #ddd; /* 浅灰色标签 */
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
        
        body.dark .info-value {
            color: #fff; /* 亮白色值 */
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        body.dark .timestamp-watermark {
            color: rgba(160, 160, 160, 0.5);
            text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
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
                    <div class="userid">QQ号: ${userInfo.user_id}</div>
                </div>
                ${contextInfo.isGroup ? `
                    <div class="group-info-container">
                        <div class="group-avatar-wrapper">
                            ${groupAvatarBase64 ? `<img class="group-avatar" src="data:image/jpeg;base64,${groupAvatarBase64}" alt="Group Avatar">` : ''}
                            <div class="group-id">群号: ${contextInfo.groupId}</div>
                        </div>
                        <div style="width: 100%; padding: 0 15px;"> 
                            ${generateGroupSpecificItems(userInfo, contextInfo)}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="info-container">
                <div class="info-title">${contextInfo.isGroup ? '成员详细信息' : '用户信息'}</div>
                <div class="info-grid">
                    ${generateInfoItems(userInfo, contextInfo)}
                </div>
            </div>
        </div>
    </div>
    <div class="timestamp-watermark">${timestamp}</div>
</body>
</html>`;
};

const getLXGWWenKaiUserInfoHtmlStr = async (userInfo, contextInfo, avatarBase64: string, groupAvatarBase64: string, fontBase64: string, enableDarkMode: boolean) => {
    // 古风背景样式 - 使用淡雅的纸质纹理背景
    const backgroundStyle = avatarBase64
        ? `background-image: 
            linear-gradient(45deg, rgba(245, 240, 230, 0.8), rgba(250, 245, 235, 0.8)),
            linear-gradient(to bottom, rgba(245, 240, 230, 0.05), rgba(250, 245, 235, 0.95)),
            url(data:image/jpeg;base64,${avatarBase64});`
        : `background: linear-gradient(45deg, #f5f0e6, #faf5eb);`;

    // 生成当前时间戳
    const timestamp = generateTimestamp();

    return `<!DOCTYPE html>
<html>
<head>
    <style>
        ${fontBase64 ? `
        @font-face {
            font-family: 'LXGWWenKai';
            src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }
        ` : ''}
        
        body {
            font-family: ${fontBase64 ? "'LXGWWenKai'," : ''} "SimSun", "FangSong", "KaiTi", serif;
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
            color: #3a2f2a;
        }
        
        /* 古风装饰边框 */
        body::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 3px solid #d4af37;
            border-radius: 20px;
            background: linear-gradient(135deg, 
                rgba(212, 175, 55, 0.1) 0%,
                rgba(184, 134, 11, 0.05) 50%,
                rgba(212, 175, 55, 0.1) 100%);
            box-shadow: 
                inset 0 0 20px rgba(212, 175, 55, 0.3),
                0 0 30px rgba(212, 175, 55, 0.2);
            z-index: 1;
        }
        
        /* 四角装饰 */
        body::after {
            content: '◆';
            position: absolute;
            top: 35px;
            left: 35px;
            font-size: 24px;
            color: #d4af37;
            z-index: 2;
            text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        }
        
        .corner-decoration {
            position: absolute;
            font-size: 24px;
            color: #d4af37;
            z-index: 2;
            text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        }
        
        .corner-decoration.top-right {
            top: 35px;
            right: 35px;
        }
        
        .corner-decoration.bottom-left {
            bottom: 35px;
            left: 35px;
        }
        
        .corner-decoration.bottom-right {
            bottom: 35px;
            right: 35px;
        }
        
        .main-container {
            width: 920px;
            height: 920px;
            position: relative;
            z-index: 3;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 50px 40px 30px 40px;
            box-sizing: border-box;
        }
        
        /* 标题区域 */
        .title-section {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .main-title {
            font-size: 36px;
            font-weight: bold;
            color: #8b4513;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(139, 69, 19, 0.3);
            letter-spacing: 4px;
        }
        
        .subtitle {
            font-size: 18px;
            color: #a0522d;
            letter-spacing: 2px;
        }
        
        /* 主要内容区域 */
        .content-area {
            display: flex;
            width: 100%;
            flex: 1;
            gap: 30px;
        }
        
        /* 左侧头像区域 */
        .avatar-section {
            flex: 0 0 300px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        
        .avatar-frame {
            position: relative;
            margin-bottom: 20px;
        }
        
        .avatar {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid #d4af37;
            box-shadow: 
                0 0 20px rgba(212, 175, 55, 0.4),
                inset 0 0 20px rgba(255, 255, 255, 0.2);
        }
        
        .avatar-decoration {
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 30px;
            color: #d4af37;
            text-shadow: 0 0 10px rgba(212, 175, 55, 0.6);
        }
        
        .user-name {
            font-size: 28px;
            font-weight: bold;
            color: #8b4513;
            margin-bottom: 8px;
            text-shadow: 1px 1px 2px rgba(139, 69, 19, 0.3);
        }
        
        .user-id {
            font-size: 16px;
            color: #a0522d;
            background: rgba(212, 175, 55, 0.1);
            padding: 6px 16px;
            border-radius: 20px;
            border: 1px solid rgba(212, 175, 55, 0.3);
            margin-bottom: 15px;
        }
        
        /* 群信息区域 */
        .group-section {
            width: 100%;
            background: rgba(212, 175, 55, 0.08);
            border: 1px solid rgba(212, 175, 55, 0.2);
            border-radius: 15px;
            padding: 15px;
            text-align: center;
        }
        
        .group-avatar {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            object-fit: cover;
            border: 2px solid #d4af37;
            margin-bottom: 8px;
        }
        
        .group-id {
            font-size: 14px;
            color: #8b4513;
            font-weight: bold;
        }
        
        /* 右侧信息区域 */
        .info-section {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            flex: 1;
        }
        
        .info-card {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(212, 175, 55, 0.3);
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.09);
            transition: all 0.3s ease;
        }
        
        .info-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(212, 175, 55, 0.2);
        }
        
        .info-card.full-width {
            grid-column: 1 / -1;
        }
        
        .info-label {
            font-size: 18px;
            color: #8b4513;
            margin-bottom: 3px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        
        .info-value {
            font-size: 27px;
            color: #3a2f2a;
            line-height: 1.3;
            word-break: break-all;
        }
        
        /* 群专属信息样式 */
        .group-info-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            margin-top: 15px;
        }
        
        .group-info-card {
            background: rgba(212, 175, 55, 0.1);
            border: 1px solid rgba(212, 175, 55, 0.25);
            border-radius: 10px;
            padding: 10px;
        }
        
        .timestamp-watermark {
            position: fixed;
            top: 1.3px;
            left: 1.3px;
            font-size: 13px;
            color: rgba(139, 69, 19, 0.5);
            font-family: 'Courier New', monospace;
            z-index: 9999;
            pointer-events: none;
            text-shadow: 0 0 2px rgba(245, 240, 230, 0.8);
        }
        
        .group-role-level {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        /* 暗黑模式 */
        body.dark {
            background: linear-gradient(45deg, #2c2416, #3a2f1f);
            color: #e6d7c3;
        }
        
        body.dark::before {
            border-color: #b8860b;
            background: linear-gradient(135deg, 
                rgba(184, 134, 11, 0.15) 0%,
                rgba(139, 69, 19, 0.1) 50%,
                rgba(184, 134, 11, 0.15) 100%);
            box-shadow: 
                inset 0 0 20px rgba(184, 134, 11, 0.4),
                0 0 30px rgba(184, 134, 11, 0.3);
        }
        
        body.dark .main-title {
            color: #daa520;
        }
        
        body.dark .subtitle {
            color: #cd853f;
        }
        
        body.dark .user-name {
            color: #daa520;
        }
        
        body.dark .user-id {
            color: #cd853f;
            background: rgba(184, 134, 11, 0.2);
            border-color: rgba(184, 134, 11, 0.4);
        }
        
        body.dark .info-card {
            background: rgba(0, 0, 0, 0.3);
            border-color: rgba(184, 134, 11, 0.4);
        }
        
        body.dark .info-label {
            color: #daa520;
        }
        
        body.dark .info-value {
            color: #e6d7c3;
        }
        
        body.dark .group-section {
            background: rgba(184, 134, 11, 0.15);
            border-color: rgba(184, 134, 11, 0.3);
        }
        
        body.dark .group-info-card {
            background: rgba(184, 134, 11, 0.2);
            border-color: rgba(184, 134, 11, 0.35);
        }
        
        body.dark .timestamp-watermark {
            color: rgba(205, 133, 63, 0.4);
            text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
        }
    </style>
</head>
<body class="${enableDarkMode ? 'dark' : ''}">
    <div class="corner-decoration top-right">◆</div>
    <div class="corner-decoration bottom-left">◆</div>
    <div class="corner-decoration bottom-right">◆</div>
    
    <div class="main-container">
        <div class="title-section">
            <div class="main-title">「 ${contextInfo.isGroup ? '群员信息' : '用户信息'} 」</div>
            <div class="subtitle">—— 详细资料 ——</div>
        </div>
        
        <div class="content-area">
            <div class="avatar-section">
                <div class="avatar-frame">
                    <div class="avatar-decoration">❀</div>
                    ${avatarBase64 ? `<img class="avatar" src="data:image/jpeg;base64,${avatarBase64}" alt="用户头像">` : '<div class="avatar" style="background: linear-gradient(45deg, #d4af37, #b8860b);"></div>'}
                </div>
                <div class="user-name">${userInfo.nickname || '未知昵称'}</div>
                <div class="user-id">QQ号: ${userInfo.user_id}</div>
                
                ${contextInfo.isGroup ? `
                    <div class="group-section">
                        ${groupAvatarBase64 ? `<img class="group-avatar" src="data:image/jpeg;base64,${groupAvatarBase64}" alt="群头像">` : ''}
                        <div class="group-id">群号: ${contextInfo.groupId}</div>
                        
                        <div class="group-info-grid">
                            ${userInfo.group_level || userInfo.role ? `
                                <div class="group-role-level">
                                    <div class="group-info-card">
                                        <div class="info-label">群等级</div>
                                        <div class="info-value">${userInfo.group_level || '未知'}</div>
                                    </div>
                                    <div class="group-info-card">
                                        <div class="info-label">群角色</div>
                                        <div class="info-value">${userInfo.role === 'owner' ? '群主' : userInfo.role === 'admin' ? '管理员' : userInfo.role === 'member' ? '成员' : '未知'}</div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${userInfo.title ? `
                                <div class="group-info-card">
                                    <div class="info-label">专属头衔</div>
                                    <div class="info-value">${userInfo.title}</div>
                                </div>
                            ` : ''}
                            
                            ${userInfo.join_time ? `
                                <div class="group-info-card">
                                    <div class="info-label">加群时间</div>
                                    <div class="info-value">${new Date(userInfo.join_time * 1000).toLocaleString('zh-CN')}</div>
                                </div>
                            ` : ''}
                            
                            ${userInfo.last_sent_time || userInfo.lastSentTime || userInfo.last_speak_time ? `
                                <div class="group-info-card">
                                    <div class="info-label">最后发言</div>
                                    <div class="info-value">${new Date((userInfo.last_sent_time || userInfo.lastSentTime || userInfo.last_speak_time) * 1000).toLocaleString('zh-CN')}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="info-section">
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-label">性别</div>
                        <div class="info-value">${userInfo.sex === 'male' ? '男' : userInfo.sex === 'female' ? '女' : '未知'}</div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-label">年龄</div>
                        <div class="info-value">${userInfo.age || '未知'}</div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-label">QQ等级</div>
                        <div class="info-value">${userInfo.level || '未知'}</div>
                    </div>
                    
                    ${userInfo.q_id || userInfo.user_id || userInfo.qq || userInfo.uin ? `
                        <div class="info-card">
                            <div class="info-label">QID</div>
                            <div class="info-value">${userInfo.q_id || userInfo.user_id || userInfo.qq || userInfo.uin}</div>
                        </div>
                    ` : ''}
                    
                    ${contextInfo.isGroup && userInfo.card ? `
                        <div class="info-card full-width">
                            <div class="info-label">群名片</div>
                            <div class="info-value">${userInfo.card}</div>
                        </div>
                    ` : ''}
                    
                    ${userInfo.sign ? `
                        <div class="info-card full-width">
                            <div class="info-label">个性签名</div>
                            <div class="info-value">${userInfo.sign}</div>
                        </div>
                    ` : ''}
                    
                    ${userInfo.RegisterTime ? `
                        <div class="info-card full-width">
                            <div class="info-label">注册时间</div>
                            <div class="info-value">${new Date(userInfo.RegisterTime).toLocaleString('zh-CN')}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    </div>
    <div class="timestamp-watermark">${timestamp}</div>
</body>
</html>`;
};

/**
 * 渲染用户信息为图片并返回 base64 编码。
 * @param ctx Koishi Context 实例
 * @param userInfo OneBot GroupMemberInfo 对象
 * @param avatarUrl 用户的头像 URL
 * @param enableDarkMode 是否启用暗黑模式
 * @param imageStyle 图片样式
 * @returns Promise<string> 图片的 base64 编码
 */
export async function renderUserInfo(
    ctx: Context, 
    userInfo: GroupMemberInfo, 
    contextInfo: ContextInfo, 
    imageStyle: ImageStyle,
    enableDarkMode: boolean, 
    imageType: ImageType,
    screenshotQuality: number,
): Promise<string> {
    const browserPage = await ctx.puppeteer.page();
    let avatarBase64: string | undefined;
    let groupAvatarBase64: string | undefined;
    let fontBase64: string | undefined;

    try {
        // 获取字体文件
        fontBase64 = await getFontBase64(ctx, imageStyle);

        // 获取用户头像， 这三个ignore是因为 OneBot GroupMemberInfo 对象没有定义avatar字段，但是实际拿到的是有的
        // @ts-ignore
        if (userInfo.avatar) {
            try {
                // @ts-ignore
                const avatarBuffer = await ctx.http.file(userInfo.avatar);
                avatarBase64 = Buffer.from(avatarBuffer.data).toString('base64');
            } catch (error) {
                // @ts-ignore
                ctx.logger.warn(`Failed to fetch user avatar from ${userInfo.avatar}: ${error.message}`);
                avatarBase64 = undefined; // 获取失败则不使用头像
            }
        }

        // 获取群头像（如果是群聊）
        if (contextInfo.isGroup && contextInfo.groupId) {
            groupAvatarBase64 = await getGroupAvatarBase64(ctx, contextInfo.groupId.toString());
        }

        // 如果头像获取失败，可以使用一个默认的头像 base64
        if (!avatarBase64) {
            ctx.logger.info('Using empty avatarBase64 or fallback for background.');
        }

        // const htmlContent = await getSourceHanSerifSCStyleUserInfoHtmlStr(userInfo, contextInfo, avatarBase64 || '', groupAvatarBase64 || '', fontBase64 || '', enableDarkMode);
        let htmlContent;
        if ( imageStyle === IMAGE_STYLES.SOURCE_HAN_SERIF_SC ) {
            htmlContent = await getSourceHanSerifSCStyleUserInfoHtmlStr (userInfo, contextInfo, avatarBase64 || '', groupAvatarBase64 || '', fontBase64 || '', enableDarkMode);
        } else if ( imageStyle === IMAGE_STYLES.LXGW_WENKAI ) {
            htmlContent = await getLXGWWenKaiUserInfoHtmlStr            (userInfo, contextInfo, avatarBase64 || '', groupAvatarBase64 || '', fontBase64 || '', enableDarkMode);
        }

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
            type: imageType,
            // quality: screenshotQuality,
            ...(imageType !== 'png' && { quality: screenshotQuality }),
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