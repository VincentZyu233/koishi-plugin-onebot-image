# koishi-plugin-onebot-info-image

[![npm](https://img.shields.io/npm/v/koishi-plugin-onebot-info-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-onebot-info-image)

获取成员信息/管理员列表，发送文字/图片/合并转发消息，仅支持onebot

推荐使用Napcat

#### Napcat平台渲染效果:
##### 用户信息：
![alt text](docs/napcat_aui.png)
##### 群管理列表：
![alt text](docs/napcat_al.png)

## dev 
### 查看git大文件
```shell
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | Where-Object { $_ -match '^blob' } | ForEach-Object { $parts = $_ -split ' ', 4; [PSCustomObject]@{ Size = [int]$parts[2]; Name = $parts[3] } } | Sort-Object Size -Descending | Select-Object -First 20 
```

### 发布到gitworkflow
#### 开发环境：
```shell
cd G:\GGames\Minecraft\shuyeyun\qq-bot\koishi-dev\koishi-dev-3\external\onebot-info-image
git add .
git commit -m "message"
git push origin main
```
#### 生产环境:
```shell
cd /home/bawuyinguo/SSoftwareFiles/koishi/awa-bot-3/external
git clone https://gitee.com/vincent-zyu/koishi-plugin-onebot-image
cd /home/bawuyinguo/SSoftwareFiles/koishi/awa-bot-3/external/koishi-plugin-onebot-image
git pull
cd /home/bawuyinguo/SSoftwareFiles/koishi/awa-bot-3
yarn && yarn build
yarn
```


```shell
# ensure plugin dir name is onebot-info-image, then:
cd G:\GGames\Minecraft\shuyeyun\qq-bot\koishi-dev\koishi-dev-3
yarn
yarn dev
yarn build onebot-info-image

$Env:HTTP_PROXY = "http://127.0.0.1:7890"
$Env:HTTPS_PROXY = "http://127.0.0.1:7890"
Invoke-WebRequest -Uri "https://www.google.com" -Method Head -UseBasicParsing
npm login --registry https://registry.npmjs.org
# login npm in browser
npm run pub onebot-info-image -- --registry https://registry.npmjs.org
npm dist-tag add koishi-plugin-onebot-info-image@0.2.0-alpha.5+20250929 latest --registry https://registry.npmjs.org

npm view koishi-plugin-onebot-info-image
npm-stat.com
```