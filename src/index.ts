// index.ts
import { Context, Schema, h } from 'koishi'
import {} from 'koishi-plugin-adapter-onebot';
import { renderUserInfo } from './render'; // 导入 renderUserInfo 函数

export const name = 'onebot-info-image'

export interface Config {
  sendText: boolean;

  sendImage: boolean;
  imageStyle: '现代风MiSansL3' | '古风LXGWWenKai';
  enableDarkMode: boolean;
  screenshotQuality: number;

  sendForward: boolean

  verboseSessionOutput: boolean
  verboseConsoleOutput: boolean
}

export const Config: Schema<Config> = Schema.intersect([

  Schema.object({
    sendText: Schema.boolean()
      .default(false)
      .description('是否 启用文本回复。')
  }).description('发送 文本 配置'),

  Schema.object({
    sendImage: Schema.boolean()
      .default(true)
      .description('是否启用 Puppeteer 渲染图片。'),
    imageStyle: Schema.union([
      Schema.const('现代风MiSansL3').description('现代风MiSansL3'),
      Schema.const('古风LXGWWenKai').description('古风LXGWWenKai'),
    ])
      .role('radio')
      .default('现代风MiSansL3')
      .description("渲染图片的风格+字体"),
    screenshotQuality: Schema.number()
      .min(0).max(100).step(1)
      .default(80)
      .description('Puppeteer 截图质量 (0-100)。'),
    enableDarkMode: Schema.boolean()
      .default(false)
      .description('是否启用暗黑模式。')
  }).description('发送 Puppeteer渲染的图片 配置'),

  Schema.object({
    sendForward: Schema.boolean()
      .default(false)
      .description('是否 启用转发消息。')
  }).description('发送 onebot转发消息 配置'),

  Schema.object({
    verboseSessionOutput: Schema.boolean()
      .default(false)
      .description('是否在会话中输出详细信息。'),
    verboseConsoleOutput: Schema.boolean()
      .default(false)
      .description('是否在控制台输出详细信息。')
  }).description('debug 配置')

]);

export const inject = {
    required: ["puppeteer", "http"] // 确保注入 puppeteer 和 http
}

export function apply(ctx: Context, config: Config) {
  ctx.command('aui', '获取用户信息并生成图片')
    .alias("awa_user_info")
    .action( async ( {session} ) => {
      if ( !session.onebot ){
        await session.send("[error]当前会话不支持onebot协议。");
        return;
      }

      if (!session.channelId && !session.guildId) { // 检查是否在群聊或私聊
        await session.send('[error]当前不在群聊或私聊中。');
        return;
      }

      let targetUserId = session.userId;
      // 检查是否有 @ 用户
      for ( const e of session.event.message.elements ){
        if ( e.type === 'at'){
          targetUserId = e.attrs.id;
          break;
        }
      }

      const userObj = await session.bot.getUser(session.userId);
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
          const formattedText = formatUserInfoForText(userInfoArg, contextInfo);
          await session.send(formattedText);
        }

        if (config.sendImage){
          const userInfoimageBase64 = await renderUserInfo(ctx, userInfoArg, contextInfo, config.enableDarkMode);
          await session.send(h.image(`data:image/png;base64,${userInfoimageBase64}`));
        }

        if (config.sendForward) {
          const forwardMessageContent = formatUserInfoForForward(userInfoArg, contextInfo);
          await session.send(h.unescape(forwardMessageContent)); // Use h.unescape to send XML
        }
        

      } catch (error) {
        ctx.logger.error(`获取用户信息或渲染图片失败: ${error}`);
        await session.send(`[error]获取用户信息或渲染图片失败: ${error.message}`);
      }
      
    })

    function formatUserInfoForText(userInfo: any, contextInfo: any): string {
      let output = '';

      // User Information
      output += `--- 用户信息 (UserInfo) ---\n`;
      output += `QQ号\t(UserID): \t\t ${userInfo.user_id}\n`;
      if (userInfo.nickname) output += `昵称\t\t(Nickname): \t ${userInfo.nickname}\n`;
      if (userInfo.card) output += `群昵称\t(GroupCard): \t ${userInfo.card}\n`;
      if (userInfo.sex) output += `性别\t\t(Gender): \t ${userInfo.sex === 'male' ? '男 (Male)' : userInfo.sex === 'female' ? '女 (Female)' : '未知 (Unknown)'}\n`;
      if (userInfo.age) output += `年龄\t\t(Age): \t ${userInfo.age}\n`;
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

    function formatUserInfoForForward(userInfo: any, contextInfo: any): string {
      let messages = '';

      // Helper to add a message block
      const addMessageBlock = (name: string, value: string) => {
        messages += `
          <message>
            <author name="${name}"/>
            ${value}
          </message>`;
      };

      // User Information
      addMessageBlock('信息类型 (Info Type):', '用户信息 (User Info)');
      addMessageBlock('QQ号 (User ID):', `${userInfo.user_id}`);
      if (userInfo.nickname) addMessageBlock('昵称 (Nickname):', `${userInfo.nickname}`);
      if (userInfo.card) addMessageBlock('群昵称 (Group Card):', `${userInfo.card}`);
      if (userInfo.sex) addMessageBlock('性别 (Gender):', `${userInfo.sex === 'male' ? '男 (Male)' : userInfo.sex === 'female' ? '女 (Female)' : '未知 (Unknown)'}`);
      if (userInfo.age !== undefined && userInfo.age !== null) addMessageBlock('年龄 (Age):', `${userInfo.age}`);
      if (userInfo.level) addMessageBlock('等级 (Level):', `${userInfo.level}`);
      if (userInfo.sign) addMessageBlock('个性签名 (Signature):', `${userInfo.sign}`);
      if (userInfo.role) addMessageBlock('群角色 (Group Role):', `${userInfo.role === 'owner' ? '群主 (Owner)' : userInfo.role === 'admin' ? '管理员 (Admin)' : '成员 (Member)'}`);
      if (userInfo.join_time) addMessageBlock('入群时间 (Join Time):', `${new Date(userInfo.join_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
      if (userInfo.RegisterTime) addMessageBlock('注册时间 (Register Time):', `${new Date(userInfo.RegisterTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);


      // Context Information (Group/Private Chat Specifics)
      addMessageBlock('信息类型 (Info Type):', '会话信息 (Context Info)');
      addMessageBlock('是否群聊 (Is Group Chat):', `${contextInfo.isGroup ? '是 (Yes)' : '否 (No)'}`);
      if (contextInfo.isGroup && contextInfo.groupId) addMessageBlock('群号 (Group ID):', `${contextInfo.groupId}`);

      // Wrap all messages in the forward tag
      return `<message forward>\n${messages}\n</message>`;
    }

}

