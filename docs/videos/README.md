# 《我还是想发这张》

一支关于给 AI 发表情的温馨生活短片，约 60 秒，9:16 竖屏。

男孩下班后给女友发了一张累瘫的小猫。回到家，和 AI 分享一天的碎碎念时，他习惯性地又想发出同一张表情。打开收藏，点一下，熟悉的聊天方式接上了。

**跟谁聊天，我都还是那个爱发表情的人。**

## 视频和表情下载

- [720p 轻量版，约 8.2 MiB](https://github.com/9OwO6/ai-stickers/releases/download/promo-warm-chat/warm-chat-720p.mp4)
- [1080p 高清版，约 45.5 MiB](https://github.com/9OwO6/ai-stickers/releases/download/promo-warm-chat/warm-chat.mp4)
- [片中六张透明小猫表情](https://github.com/9OwO6/ai-stickers/releases/download/promo-warm-chat/cute-cat-stickers.zip)
- [对白字幕 SRT](warm-chat.srt)
- [完整发布页](https://github.com/9OwO6/ai-stickers/releases/tag/promo-warm-chat)

浏览器可能直接播放 MP4，也可能下载后播放。小猫 ZIP 解压后，打开随手表情的「管理 → 多图导入」，选中六张 PNG，检查预览并确认导入即可。扩展本身仍不预置表情。

大体积视频放在 Releases 中；本目录保存封面、字幕和说明。这个发布是宣传素材，不是扩展版本升级，扩展仍为 0.5.2。

## 制作和验证

- 内置 imagegen 生成八张二次元生活镜头、六张独立透明小猫表情，经 Remotion 制作为动态分镜。不是角色逐帧动画或口型同步视频。
- 配音使用 Microsoft Edge 合成语音 Yunxi / Xiaoxiao，没有克隆真人；配乐、消息声及生活音效为程序原创合成。
- 插件片段实际加载 0.5.2 扩展，使用隔离 Chromium 和路由到本地的演示聊天页面，没有使用真实 AI 账号。已验证六张导入、只发图且不加解释、保留已有文字一起发送，以及发送后自动收起，未出现页面运行错误。
- 人物、聊天内容及 AI 回应为剧情示意。AI 理解表情的效果取决于平台、模型和上下文；插件没有额外情绪识别模型。
- 未使用作者私人表情或真实聊天记录。成片为 H.264 / AAC，1080×1920、30 fps，完整解码检查通过；对白时间线无重叠。

图片输入可能增加平台用量和等待时间，详情见项目首页的「多一点消耗，换一点情绪价值」。片中出现的香企鹅项目标识仍遵循首页对角色二创素材的授权边界。
