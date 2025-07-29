// index.ts
import { Context, Schema, h } from 'koishi'
import {} from 'koishi-plugin-adapter-onebot';

import { IMAGE_STYLES, type ImageStyle } from './constants';
import { renderUserInfo } from './renderUserInfo'; // 导入 renderUserInfo 函数
import { renderAdminList, type AdminInfo } from './renderAdminList'; // 导入 renderAdminList 函数

export const name = 'onebot-info-image'

export const usage = `
<hr>

<h3>字体使用声明</h3>
<p>本插件使用以下开源字体进行图像渲染：</p>
<ul>
  <li><b>思源宋体（Source Han Serif SC）</b> - 由 Adobe 与 Google 联合开发，遵循 <a href="https://openfontlicense.org">SIL Open Font License 1.1</a> 协议。</li>
  <li><b>霞鹜文楷（LXGW WenKai）</b> - 由 LXGW 开发并维护，遵循 <a href="https://openfontlicense.org">SIL Open Font License 1.1</a> 协议。</li>
</ul>
<p>两者均为自由字体，可在本项目中自由使用、修改与发布。若你也在开发相关插件或项目，欢迎一同使用这些优秀的字体。</p>

---

<h3>插件许可声明</h3>
<p>本插件为开源免费项目，基于 MIT 协议开放。欢迎修改、分发、二创。</p>
<p>如果你觉得插件好用，欢迎在 GitHub 上 Star 或通过其他方式给予支持（例如提供服务器、API Key 或直接赞助）！</p>
<p>感谢所有开源字体与项目的贡献者 ❤️</p>
`;


export interface Config {
  enableUserInfoCommand: boolean;
  enableGroupAdminListCommand: boolean;

  sendText: boolean;
  enableQuoteWithText: boolean;

  sendImage: boolean;
  enableQuoteWithImage: boolean
  imageStyle: ImageStyle;
  enableDarkMode: boolean;
  screenshotQuality: number;

  sendForward: boolean

  verboseSessionOutput: boolean
  verboseConsoleOutput: boolean
}

export const Config: Schema<Config> = Schema.intersect([

  Schema.object({
    enableUserInfoCommand: Schema.boolean()
      .default(true)
      .description('是否启用用户信息命令。'),
    enableGroupAdminListCommand: Schema.boolean()
      .default(false)
      .description('是否启用群管理员列表命令。'),
  }).description('基础配置'),

  Schema.object({
    sendText: Schema.boolean()
      .default(false)
      .description('是否 启用文本回复。'),
    enableQuoteWithText: Schema.boolean()
      .default(false)
      .description('回复文本的时候，是否带引用触发指令的消息'),
  }).description('发送 文本 配置'),

  Schema.object({
    sendImage: Schema.boolean()
      .default(true)
      .description('是否启用 Puppeteer 渲染图片。'),
    enableQuoteWithImage: Schema.boolean()
      .default(false)
      .description('回复图片的时候，是否带引用触发指令的消息'),
    imageStyle: Schema.union([
      Schema.const(IMAGE_STYLES.SOURCE_HAN_SERIF_SC).description('现代风格，使用SourceHanSerifSC 思源宋体'),
      Schema.const(IMAGE_STYLES.LXGW_WENKAI).description('简洁古风，使用LXGWWenKai 字体'),
    ])
      .role('radio')
      .default(IMAGE_STYLES.SOURCE_HAN_SERIF_SC)
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

  //帮助文本中的 结果信息格式
  const responseHint = [
    config.sendText && '文本消息',
    config.sendImage && '图片消息',
    config.sendForward && '合并转发消息'
  ].filter(Boolean).join('、');

  if ( config.enableUserInfoCommand ) 
    ctx.command('aui', `获取用户信息, 发送${responseHint}`)
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
            const formattedText = formatUserInfoForText(userInfoArg, contextInfo);
            await session.send(formattedText);
          }

          if (config.sendImage){
            const userInfoimageBase64 = await renderUserInfo(ctx, userInfoArg, contextInfo, config.enableDarkMode, config.imageStyle);
            await session.send(h.image(`data:image/png;base64,${userInfoimageBase64}`));
          }

          if (config.sendForward) {
            const forwardMessageContent = formatUserInfoForForward(userInfoArg, contextInfo);
            await session.send(h.unescape(forwardMessageContent)); 
          }
          

        } catch (error) {
          ctx.logger.error(`获取用户信息或渲染图片失败: ${error}`);
          await session.send(`[error]获取用户信息或渲染图片失败: ${error.message}`);
        }
        
      })
    
  if ( config.enableGroupAdminListCommand )
    ctx.command('al', `获取群管理员列表, 发送${responseHint}`)
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
          const admins: AdminInfo[] = [];
          for (const member of groupAdminMemberListObj) {
            try {
              // @ts-ignore - getGroupMemberList()返回的数组里面，每一个member对象 实际包含 user_id 字段，但类型定义中缺失 (here ↓)
              // node_modules/koishi-plugin-adapter-onebot/lib/types.d.ts:  export interface GroupMemberInfo extends SenderInfo
              const userObj = await session.bot.getUser(member.user_id);
              admins.push({
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

          const contextInfo = {
            isGroup: true,
            groupId: parseInt(session.guildId),
            groupName: groupInfoObj.group_name || '未知群聊',
            memberCount: groupInfoObj.member_count || 0,
            maxMemberCount: groupInfoObj.max_member_count || 0,
            groupAvatarUrl: `https://p.qlogo.cn/gh/${session.guildId}/${session.guildId}/640/`
          };

          if (config.sendText) {
            const formattedText = formatAdminListForText(admins, contextInfo);
            await session.send(formattedText);
          }

          if (config.sendImage) {
            const adminListImageBase64 = await renderAdminList(ctx, admins, contextInfo, config.enableDarkMode, config.imageStyle);
            await session.send(h.image(`data:image/png;base64,${adminListImageBase64}`));
          }

          if (config.sendForward) {
            const forwardMessageContent = formatAdminListForForward(admins, contextInfo);
            await session.send(h.unescape(forwardMessageContent));
          }

        } catch (error) {
          ctx.logger.error(`获取群管理员列表失败: ${error}`);
          await session.send(`[error]获取群管理员列表失败: ${error.message}`);
        }
      })

    ctx.command("debug")
      .action(async ({ session }) => {

        //write debug code here (*╹▽╹*)

        const groupInfoObj = await session.onebot.getGroupInfo(session.guildId);
        let groupInfoObjMsg = `groupInfoObj = \n\t ${JSON.stringify(groupInfoObj)}`;
        if ( config.verboseSessionOutput ) await session.send(groupInfoObjMsg);
        if ( config.verboseConsoleOutput ) ctx.logger.info(groupInfoObjMsg);

      });

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

    function formatAdminListForText(admins: AdminInfo[], contextInfo: any): string {
      let output = '';

      output += `--- 群管理员列表 (Group Admin List) ---\n`;
      output += `群名称 (Group Name): ${contextInfo.groupName || '未知群聊'}\n`;
      output += `群号 (Group ID): ${contextInfo.groupId}\n`;
      output += `成员数 (Member Count): ${contextInfo.memberCount}/${contextInfo.maxMemberCount}\n`;
      output += `管理员数量 (Admin Count): ${admins.length}\n\n`;

      admins.forEach((admin, index) => {
        output += `${index + 1}. ${admin.role === 'owner' ? '群主' : '管理员'} (${admin.role === 'owner' ? 'Owner' : 'Admin'})\n`;
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

    function formatAdminListForForward(admins: AdminInfo[], contextInfo: any): string {
        let messages = '';

        // Helper to add a message block with author
        const addMessageBlock = (authorId: string, authorName: string, title: string, summary: string) => {
            messages += `
              <message>
                <author ${authorId ? `id="${authorId}"` : ``} name="${authorName}"/>
                -----${title}-----
                ${summary}
              </message>`;
        };

        // First message: Group basic information
        addMessageBlock(
            undefined,
            '群聊基本信息',
            '群聊概览',
            `群号: ${contextInfo.groupId}\n成员数: ${contextInfo.memberCount}/${contextInfo.maxMemberCount}\n管理员数量: ${admins.length}`
        );

        // Subsequent messages: Each admin's full information
        for (const admin of admins) {
            const authorName = admin.card || admin.nickname || `QQ: ${admin.user_id}`;
            const adminDetails = [
                `QQ: ${admin.user_id}`,
                `角色: ${admin.role === 'owner' ? '群主' : '管理员'}`,
                admin.card ? `群名片: ${admin.card}` : '',
                admin.level ? `等级: ${admin.level}` : '',
                admin.join_time ? `入群时间: ${new Date(admin.join_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '',
                admin.title ? `头衔: ${admin.title}` : ''
            ].filter(Boolean).join('\n'); // Filter out empty strings and join with newline

            addMessageBlock(
              admin.user_id.toString(),
              authorName,
              `${admin.nickname || admin.user_id} 的信息`,
              adminDetails
            );
        }
        
        // Wrap all messages in the forward tag
        return `<message forward>\n${messages}\n</message>`;
    }

}

