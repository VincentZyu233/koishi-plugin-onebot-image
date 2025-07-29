// index.ts
import { Context, Schema, h } from 'koishi'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {} from 'koishi-plugin-adapter-onebot';

import { IMAGE_STYLES, type ImageStyle, IMAGE_TYPES, type ImageType } from './constants';
import { renderUserInfo } from './renderUserInfo'; // 导入 renderUserInfo 函数
import { renderAdminList, type AdminInfo } from './renderAdminList'; // 导入 renderAdminList 函数
import { group } from 'console';

export const name = 'onebot-info-image'

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
)

const CONTACT_DEV_ZYU = `请联系开发者VincentZyu。加QQ群:259248174`;

export const usage = `
<h2>🎯 插件版本：v${pkg.version}</h2>
<p>插件使用问题 / Bug反馈 / 插件开发交流，欢迎加入QQ群：<b>259248174</b></p>

<hr>

<p>📦 插件仓库地址：</p>
<ul>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-onebot-image">Gitee</a></li>
  <li><a href="https://github.com/VincentZyu233/koishi-plugin-onebot-image">GitHub</a></li>
</ul>

<hr>

<h3>字体使用声明</h3>
<p>本插件使用以下开源字体进行图像渲染：</p>
<ul>
  <li><b>思源宋体（Source Han Serif SC）</b> - 由 Adobe 与 Google 联合开发，遵循 <a href="https://openfontlicense.org">SIL Open Font License 1.1</a> 协议。</li>
  <li><b>霞鹜文楷（LXGW WenKai）</b> - 由 LXGW 开发并维护，遵循 <a href="https://openfontlicense.org">SIL Open Font License 1.1</a> 协议。</li>
</ul>
<p>两者均为自由字体，可在本项目中自由使用、修改与发布。若你也在开发相关插件或项目，欢迎一同使用这些优秀的字体。</p>

<hr>

<h3>插件许可声明</h3>
<p>本插件为开源免费项目，基于 MIT 协议开放。欢迎修改、分发、二创。</p>
<p>如果你觉得插件好用，欢迎在 GitHub 上 Star 或通过其他方式给予支持（例如提供服务器、API Key 或直接赞助）！</p>
<p>感谢所有开源字体与项目的贡献者 ❤️</p>
`


export interface Config {
  enableUserInfoCommand: boolean;
  userinfoCommandName: string;
  enableGroupAdminListCommand: boolean;
  groupAdminListCommandName: string;

  sendText: boolean;
  enableQuoteWithText: boolean;

  sendImage: boolean;
  enableQuoteWithImage: boolean
  imageStyle: ImageStyle;
  enableDarkMode: boolean;
  imageType: ImageType;
  screenshotQuality: number;

  sendForward: boolean

  verboseSessionOutput: boolean
  verboseConsoleOutput: boolean
}
export const Config: Schema<Config> = Schema.intersect([

  Schema.object({
    enableUserInfoCommand: Schema.boolean()
      .default(true)
      .description('ℹ️ 是否启用用户信息命令。'),
    userinfoCommandName: Schema.string()
      .default('用户信息')
      .description('🔍 用户信息命令名称。'),
    enableGroupAdminListCommand: Schema.boolean()
      .default(false)
      .description('👥 是否启用群管理员列表命令。'),
    groupAdminListCommandName: Schema.string()
      .default('群管理列表')
      .description('👥 群管理员列表命令名称。'),
  }).description('基础配置 ⚙️'),

  Schema.object({
    sendText: Schema.boolean()
      .default(false)
      .description('💬 是否启用文本回复。'),
    enableQuoteWithText: Schema.boolean()
      .default(false)
      .description('↩️ 回复文本的时候，是否带引用触发指令的消息。'),
  }).description('发送 文本 配置 📝'),

  Schema.object({
    sendImage: Schema.boolean()
      .default(true)
      .description('🖼️ 是否启用 Puppeteer 渲染图片。'),
    enableQuoteWithImage: Schema.boolean()
      .default(false)
      .description('📸 回复图片的时候，是否带引用触发指令的消息。'),
    imageStyle: Schema.union([
      Schema.const(IMAGE_STYLES.SOURCE_HAN_SERIF_SC).description('✨ 现代风格，使用SourceHanSerifSC 思源宋体'),
      Schema.const(IMAGE_STYLES.LXGW_WENKAI).description('📜 简洁古风，使用LXGWWenKai 字体'),
    ])
      .role('radio')
      .default(IMAGE_STYLES.SOURCE_HAN_SERIF_SC)
      .description("🎨 渲染图片的风格与字体。"),
    enableDarkMode: Schema.boolean()
      .default(false)
      .description('🌙 是否启用暗黑模式。'),
    imageType: Schema.union([
      Schema.const(IMAGE_TYPES.PNG).description(`🖼️ ${IMAGE_TYPES.PNG}, ❌ 不支持调整quality`),
      Schema.const(IMAGE_TYPES.JPEG).description(`🌄 ${IMAGE_TYPES.JPEG}, ✅ 支持调整quality`),
      Schema.const(IMAGE_TYPES.WEBP).description(`🌐 ${IMAGE_TYPES.WEBP}, ✅ 支持调整quality`),
    ])
      .role('radio')
      .default(IMAGE_TYPES.PNG)
      .description("📤 渲染图片的输出类型。"),
    screenshotQuality: Schema.number()
      .min(0).max(100).step(1)
      .default(80)
      .description('📏 Puppeteer 截图质量 (0-100)。'),

  }).description('发送 Puppeteer渲染的图片 配置 🎨'),

  Schema.object({
    sendForward: Schema.boolean()
      .default(false)
      .description('➡️ 是否启用转发消息。'),
  }).description('发送 onebot转发消息 配置 ✉️'),

  Schema.object({
    verboseSessionOutput: Schema.boolean()
      .default(false)
      .description('🗣️ 是否在会话中输出详细信息。'),
    verboseConsoleOutput: Schema.boolean()
      .default(false)
      .description('💻 是否在控制台输出详细信息。'),
  }).description('调试 (Debug) 配置 🐞')

]);

export const inject = {
    required: ["puppeteer", "http"] // 确保注入 puppeteer 和 http
}

export function apply(ctx: Context, config: Config) {

  //帮助文本中的 结果信息格式
  const responseHint = [
    config.sendText && '文本消息',
    config.sendImage && '图片消息',
    config.sendForward && '合并转发消息'
  ].filter(Boolean).join('、');

  if ( config.enableUserInfoCommand ) 
    ctx.command(config.userinfoCommandName, `获取用户信息, 发送${responseHint}`)
      .alias('aui')
      .alias("awa_user_info")
      .action( async ( {session} ) => {
        if ( !session.onebot )
          return session.send("[error]当前会话不支持onebot协议。");

        let targetUserId = session.userId;
        // 检查是否有 @ 用户
        for ( const e of session.event.message.elements ){
          if ( e.type === 'at'){
            targetUserId = e.attrs.id;
            break;
          }
        }

        const userObj = await session.bot.getUser(targetUserId);
        let userObjMsg = `userObj = \n\t ${JSON.stringify(userObj)}`;
        // await session.send(userObjMsg);
        const userAvatarUrl = userObj.avatar;

        let userInfoArg;
        let contextInfo = {
          isGroup: false,
          groupId: null,
          groupAvatarUrl: null
        };

        try {
          // 获取陌生人信息（包含头像等基本信息）
          const strangerInfoObj = await session.onebot.getStrangerInfo(targetUserId);
          let strangerInfoObjMsg = `strangerInfoObj = \n\t ${JSON.stringify(strangerInfoObj)}`;
          if ( config.verboseSessionOutput ) await session.send(strangerInfoObjMsg);
          if ( config.verboseConsoleOutput ) ctx.logger.info(strangerInfoObjMsg);

          if (session.guildId) { // 如果在群聊中
            const groupMemberInfoObj = await session.onebot.getGroupMemberInfo(
              session.guildId, 
              targetUserId
            );
            let groupMemberInfoObjMsg = `groupMemberInfoObj = \n\t ${JSON.stringify(groupMemberInfoObj)}`;
            if ( config.verboseSessionOutput ) await session.send(groupMemberInfoObjMsg);
            if ( config.verboseConsoleOutput ) ctx.logger.info(groupMemberInfoObjMsg);
            
            // 合并群成员信息和陌生人信息，优先保留陌生人信息中的关键字段
            userInfoArg = {
              ...groupMemberInfoObj,
              ...strangerInfoObj,
              age: strangerInfoObj.age,
              // @ts-ignore - strangerInfoObj 实际包含 level 字段，但类型定义中缺失 (here ↓)
              // node_modules/koishi-plugin-adapter-onebot/lib/types.d.ts:  export interface StrangerInfo ...
              level: strangerInfoObj.level,
              sex: strangerInfoObj.sex,
              card: groupMemberInfoObj.card,
              role: groupMemberInfoObj.role,
              join_time: groupMemberInfoObj.join_time,
              last_sent_time: groupMemberInfoObj.last_sent_time,
              group_level: groupMemberInfoObj.level,
              title: groupMemberInfoObj.title,
              avatar: userObj.avatar
            };
            
            // 设置群聊上下文信息
            contextInfo = {
              isGroup: true,
              groupId: session.guildId,
              groupAvatarUrl: `https://p.qlogo.cn/gh/${session.guildId}/${session.guildId}/640/`
            };
          } else {
            // 私聊情况，只使用陌生人信息
            userInfoArg = {
              ...strangerInfoObj,
              // 确保头像字段存在
              avatar: userObj.avatar
            };
            contextInfo = {
              isGroup: false,
              groupId: null,
              groupAvatarUrl: null
            };
          }

          let userInfoArgMsg = `userInfoArg = \n\t ${JSON.stringify(userInfoArg)}`;
          let contextInfoMsg = `contextInfo = \n\t ${JSON.stringify(contextInfo)}`;
          if ( config.verboseSessionOutput ) {
            await session.send(userInfoArgMsg);
            await session.send(contextInfoMsg);
          }
          if ( config.verboseConsoleOutput ) {
            await ctx.logger.info(userInfoArgMsg);
            await ctx.logger.info(contextInfoMsg);
          }

          if (config.sendText) {
            ctx.logger.info("text");
            const formattedText = formatUserInfoDirectText(userInfoArg, contextInfo);
            session.send(`${config.enableQuoteWithText ? h.quote(session.messageId) : ''}${formattedText}`);
          }

          if (config.sendImage){
            const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🔄正在渲染用户信息图片，请稍候⏳...`);
            const timeout = new Promise<string>((_, reject) => {
              // QQ的撤回时限是120s，所以这里设置100s的timeoue
              setTimeout(() => reject(new Error('timeout')), 100 * 1000);
            });
            try {
              const userInfoimageBase64 = await Promise.race([
                renderUserInfo(ctx, userInfoArg, contextInfo, config.imageStyle, config.enableDarkMode, config.imageType, config.screenshotQuality),
                timeout
              ]);

              await session.send(`${config.enableQuoteWithImage ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${userInfoimageBase64}`)}`);
            } catch (err) {
              await session.send(`${h.quote(session.messageId)}❌ 渲染失败，请稍后再试。${config.verboseSessionOutput ? `\n err =  ${err}` : ''}`);
              if ( config.verboseSessionOutput ) ctx.logger.info(`渲染用户信息图片失败。 err = ${err}`);
            } finally {
              // 无论成功失败都撤回提示
              await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
            }
          }

          if (config.sendForward) {
            const forwardMessageContent = formatUserInfoForwardText(session.bot, userInfoArg, contextInfo);
            session.send(h.unescape(forwardMessageContent)); 
          }
          

        } catch (error) {
          ctx.logger.error(`获取用户信息或渲染图片失败: ${error}`);
          await session.send(`[error]获取用户信息或渲染图片失败: ${error.message}`);
        }
        
      })
    
  if ( config.enableGroupAdminListCommand )
    ctx.command(config.groupAdminListCommandName, `获取群管理员列表, 发送${responseHint}`)
      .alias('al')
      .alias("awa_group_admin_list")
      .action( async ( {session, options} ) => {
        if ( !session.onebot )
          return session.send("[error]当前会话不支持onebot协议。");

        if ( !session.guildId )
          return session.send("[error]当前会话不在群聊中。");

        try {
          const groupMemberListObj = await session.onebot.getGroupMemberList(session.guildId);
          const groupInfoObj = await session.onebot.getGroupInfo(session.guildId);
          const groupAdminMemberListObj = groupMemberListObj.filter(m => m.role === 'admin' || m.role === 'owner');
          
          let groupAdminMemberListObjMsg = `groupAdminMemberListObj = \n\t ${JSON.stringify(groupAdminMemberListObj)}`;
          if ( config.verboseSessionOutput ) await session.send(groupAdminMemberListObjMsg);
          if ( config.verboseConsoleOutput ) ctx.logger.info(groupAdminMemberListObjMsg);

          if (groupAdminMemberListObj.length === 0) {
            return session.send("该群没有管理员。");
          }

          // 获取管理员头像并转换为 AdminInfo 格式
          const adminListArg: AdminInfo[] = [];
          for (const member of groupAdminMemberListObj) {
            try {
              // @ts-ignore - getGroupMemberList()返回的数组里面，每一个member对象 实际包含 user_id 字段，但类型定义中缺失 (here ↓)
              // node_modules/koishi-plugin-adapter-onebot/lib/types.d.ts:  export interface GroupMemberInfo extends SenderInfo
              const userObj = await session.bot.getUser(member.user_id);
              adminListArg.push({
                user_id: member.user_id,
                nickname: member.nickname,
                card: member.card,
                role: member.role as 'owner' | 'admin',
                level: member.level,
                join_time: member.join_time,
                last_sent_time: member.last_sent_time,
                title: member.title,
                avatar: userObj.avatar || ''
              });
            } catch (error) {
              ctx.logger.error(`获取管理员列表信息失败: ${error}`);
            }
          }

          adminListArg.sort((a, b) => {
            // 群主优先
            if (a.role === 'owner' && b.role !== 'owner') return -1
            if (a.role !== 'owner' && b.role === 'owner') return 1

            // 非群主之间按 card 字典序降序
            const cardA = a.card || ''
            const cardB = b.card || ''
            return cardB.localeCompare(cardA, 'zh') // 支持中文拼音
          })

          const contextInfo = {
            isGroup: true,
            groupId: parseInt(session.guildId),
            groupName: groupInfoObj.group_name || '未知群聊',
            memberCount: groupInfoObj.member_count || 0,
            maxMemberCount: groupInfoObj.max_member_count || 0,
            groupAvatarUrl: `https://p.qlogo.cn/gh/${session.guildId}/${session.guildId}/640/`
          };

          if (config.sendText) {
            const formattedText = formatAdminListDirectText(adminListArg, contextInfo);
            await session.send(`${config.enableQuoteWithText ? h.quote(session.messageId) : ''}${formattedText}`);
          }

          if (config.sendImage) {
            const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🔄正在渲染群管理员列表图片，请稍候⏳...`);
            const timeout = new Promise<string>((_, reject) => {
              // QQ的撤回时限是120s，所以这里设置100s的timeoue
              setTimeout(() => reject(new Error('timeout')), 100 * 1000);
            });
            try {
              const adminListImageBase64 = await Promise.race([
                renderAdminList(ctx, adminListArg, contextInfo, config.imageStyle, config.enableDarkMode, config.imageType, config.screenshotQuality),
                timeout
              ]);

              await session.send(`${config.enableQuoteWithImage ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${adminListImageBase64}`)}`);
            } catch (err) {
              await session.send(`${h.quote(session.messageId)}❌ 渲染失败，请稍后再试。${config.verboseSessionOutput ? `\n err =  ${err}` : ''}`);
              if ( config.verboseSessionOutput ) ctx.logger.info(`渲染群管理员列表图片失败。 err = ${err}`);
            } finally {
              // 无论成功失败都撤回提示
              await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
            }
          }

          if (config.sendForward) {
            const forwardMessageContent = formatAdminListForwardText(adminListArg, contextInfo);
            await session.send(h.unescape(forwardMessageContent));
          }

        } catch (error) {
          ctx.logger.error(`获取群管理员列表失败: ${error}`);
          await session.send(`[error]获取群管理员列表失败: ${error.message}`);
        }
      })

    // ctx.command("debug")
    //   .action(async ({ session }) => {

    //     //write debug code here (*╹▽╹*)

    //   });

    function formatUserInfoDirectText(userInfo: any, contextInfo: any): string {
      let output = '';

      // User Information
      output += `----- 用户信息 (UserInfo) -----\n`;
      output += `QQ号\t(UserID): \t\t ${userInfo.user_id}\n`;
      if (userInfo.nickname) output += `昵称\t\t(Nickname): \t ${userInfo.nickname}\n`;
      if (userInfo.card) output += `群昵称\t(GroupCard): \t ${userInfo.card}\n`;
      if (userInfo.sex) output += `性别\t\t(Gender): \t ${userInfo.sex === 'male' ? '男 (Male)' : userInfo.sex === 'female' ? '女 (Female)' : '未知 (Unknown)'}\n`;
      if (userInfo.age) output += `年龄\t\t(Age): \t\t ${userInfo.age}\n`;
      if (userInfo.level) output += `等级\t\t(Level): \t\t ${userInfo.level}\n`;
      if (userInfo.sign) output += `个性签名\t(Signature): \t ${userInfo.sign}\n`;
      if (userInfo.role) output += `群角色\t(GroupRole): \t ${userInfo.role === 'owner' ? '群主 (Owner)' : userInfo.role === 'admin' ? '管理员 (Admin)' : '成员 (Member)'}\n`;
      if (userInfo.join_time) output += `入群时间\t(JoinTime): \t ${new Date(userInfo.join_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;
      if (userInfo.RegisterTime) output += `注册时间\t(RegTime): \t ${new Date(userInfo.RegisterTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;


      // Context Information (Group/Private Chat Specifics)
      output += `\n--- 会话信息 (ContextInfo) ---\n`;
      output += `是否群聊 \t (IsGroupChat): ${contextInfo.isGroup ? '是 (Yes)' : '否 (No)'}\n`;
      if (contextInfo.isGroup && contextInfo.groupId) output += `群号 \t (GroupID): \t ${contextInfo.groupId}\n`;

      return output;
    }

    function formatUserInfoForwardText(botSelf: any, userInfo: any, contextInfo: any): string {
      let messages = '';

      // Helper to add a message block
      const addMessageBlock = (authorId: string, authorName: string, value: string) => {
        messages += `
          <message>
            <author ${authorId ? `id="${authorId}"` : ``} ${authorName ? `name="${authorName}"` : ``}/>
            ${value}
          </message>`;
      };

      // User Information
      addMessageBlock(undefined, '当前时间 (CurrentTime):', `${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
      addMessageBlock(undefined, '信息类型 (InfoType):', '用户信息 (User Info)');
      addMessageBlock(userInfo.user_id, undefined, `QQ号 (UserID):\t${userInfo.user_id}`);
      if (userInfo.nickname) addMessageBlock(userInfo.user_id, undefined, `昵称 (Nickname):\t${userInfo.nickname}`);
      if (userInfo.card) addMessageBlock(userInfo.user_id, undefined, `群昵称 (GroupCard):\t${userInfo.card}`);
      if (userInfo.sex) addMessageBlock(userInfo.user_id, undefined, `性别 (Gender):\t\t${userInfo.sex === 'male' ? '男 (Male)' : userInfo.sex === 'female' ? '女 (Female)' : '未知 (Unknown)'}`);
      if (userInfo.age !== undefined && userInfo.age !== null) addMessageBlock(userInfo.user_id, undefined, `年龄 (Age):\t${userInfo.age}`);
      if (userInfo.level) addMessageBlock(userInfo.user_id, undefined, `等级 (Level):\t${userInfo.level}`);
      if (userInfo.sign) addMessageBlock(userInfo.user_id, undefined, `个性签名 (Signature):\t${userInfo.sign}`);
      if (userInfo.role) addMessageBlock(userInfo.user_id, undefined, `群角色 (GroupRole):\t\t${userInfo.role === 'owner' ? '群主 (Owner)' : userInfo.role === 'admin' ? '管理员 (Admin)' : '成员 (Member)'}`);
      if (userInfo.join_time) addMessageBlock(userInfo.user_id, undefined, `入群时间 (JoinTime):\t${new Date(userInfo.join_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
      if (userInfo.RegisterTime) addMessageBlock(userInfo.user_id, undefined, `注册时间 (RegTime):\t${new Date(userInfo.RegisterTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);


      // Context Information (Group/Private Chat Specifics)
      addMessageBlock(botSelf.userId, '信息类型 (Info Type):', '会话信息 (Context Info)');
      addMessageBlock(botSelf.userId, '是否群聊 (Is Group Chat):', `${contextInfo.isGroup ? '是 (Yes)' : '否 (No)'}`);
      if (contextInfo.isGroup && contextInfo.groupId) addMessageBlock(botSelf.userId, '群号 (Group ID):', `${contextInfo.groupId}`);

      // Wrap all messages in the forward tag
      return `<message forward>\n${messages}\n</message>`;
    }

    function formatAdminListDirectText(adminListArg: AdminInfo[], contextInfo: any): string {
      let output = '';

      output += `当前时间 (Current Time): ${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;
      output += `===== 群管理员列表 (Group Admin List) =====\n`;
      output += `群名称 (Group Name): ${contextInfo.groupName || '未知群聊'}\n`;
      output += `群号 (Group ID): ${contextInfo.groupId}\n`;
      output += `成员数 (Member Count): ${contextInfo.memberCount}/${contextInfo.maxMemberCount}\n`;
      output += `管理员数量 (Admin Count): ${adminListArg.length}\n\n`;

      adminListArg.forEach((admin, index) => {
        output += `-----No. ${index + 1}. ${admin.role === 'owner' ? '群主' : '管理员'} (${admin.role === 'owner' ? 'Owner' : 'Admin'})-----\n`;
        output += `   QQ号 (User ID): ${admin.user_id}\n`;
        output += `   昵称 (Nickname): ${admin.nickname || '未知'}\n`;
        if (admin.card) output += `   群名片 (Group Card): ${admin.card}\n`;
        if (admin.level) output += `   等级 (Level): ${admin.level}\n`;
        if (admin.join_time) output += `   入群时间 (Join Time): ${new Date(admin.join_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;
        if (admin.title) output += `   头衔 (Title): ${admin.title}\n`;
        output += '\n';
      });

      return output;
    }

    function formatAdminListForwardText(adminListArg: AdminInfo[], contextInfo: any): string {
        let messages = '';

        // Helper to add a message block with author
        const addMessageBlock = (authorId: string, authorName: string, adminUsrInfoStr: string) => {
            messages += `
              <message>
                <author ${authorId ? `id="${authorId}"` : ``} name="${authorName}"/>
                ${adminUsrInfoStr}
              </message>`;
        };

        // First message: Group basic information
        addMessageBlock(
            undefined,
            '群聊基本信息',
            [
              `当前时间: \t ${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
              `=========群聊信息=========`,
              `群名称: \t ${contextInfo.groupName || '未知群聊'}`,
              `群号: \t ${contextInfo.groupId}`,
              `成员数: \t ${contextInfo.memberCount}/${contextInfo.maxMemberCount}`,
              `管理员数量: \t ${adminListArg.length}`
            ].join('\n')
        );

        // Subsequent messages: Each admin's full information
        // for (const admin of adminListArg) {
        for ( let i = 0; i < adminListArg.length; i++ ) {
            const admin = adminListArg[i];
            const authorName = admin.card || admin.nickname || `QQ: ${admin.user_id}`;
            const adminDetails = [
                `---------No. ${i+1}---------`,
                `QQ号: \t ${admin.user_id}`,
                `昵称: \t ${admin.nickname}`,
                `角色: \t ${admin.role === 'owner' ? '群主' : '管理员'}`,
                admin.card ? `群昵称: \t ${admin.card}` : '',
                admin.level ? `等级: \t ${admin.level}` : '',
                admin.title ? `群头衔: \t ${admin.title}` : '',
                admin.join_time ? `加入本群时间: \t ${new Date(admin.join_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '',
                admin.last_sent_time ? `最后发言时间: \t ${new Date(admin.last_sent_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '',
                
            ].filter(Boolean).join('\n'); // Filter out empty strings and join with newline

            addMessageBlock(
              admin.user_id.toString(),
              authorName,
              adminDetails
            );
        }
        
        // Wrap all messages in the forward tag
        return `<message forward>\n${messages}\n</message>`;
    }

}

