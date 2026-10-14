# 求职作品介绍

## 一句话介绍

开发了一个 Chrome 扩展，让用户在 ChatGPT 和 Muse 网页中收藏、批量导入并快捷发送个人表情图片，支持文字与图片组合发送及本地备份。

## 可以展示的工程内容

- 使用 Manifest V3、Service Worker 与 IndexedDB 管理扩展本地图片库，保存原文件并生成静态缩略图。
- 实现文件夹导入、子目录分组、SHA-256 内容去重、分块写入及错误统计。
- 使用 Shadow DOM 隔离界面样式，并处理网页初始化移除扩展节点、扩展重载使脚本失效等生命周期问题。
- 针对第三方网页实现输入框与附件适配，检查上传期间草稿变化，避免误发。
- 根据真实试用反馈迭代添加步骤、固定尺寸分页、发送后收起及文字搭配表情。
- 使用隔离 Chromium 配置测试真实扩展加载，明确模拟回归与真实站点测试的边界。

## 英文 résumé / portfolio bullet

Built a Manifest V3 Chrome extension for saving, importing, and sending personal sticker images in AI chat interfaces, with IndexedDB storage, SHA-256 deduplication, and draft-change protection during uploads.

Iterated the interaction flow based on hands-on feedback, adding automatic image saving, a fixed-size paginated picker, combined text-and-image sending, and automatic dismissal after sending.

## 面试时的边界

可以讲需求判断、工程取舍、故障定位和验证方法。不要声称已上架商店、拥有大量用户、实现所有平台稳定适配、训练了模型或提供平台原生贴纸消息；目前均无对应证据。Muse 的完整真实平台验证仍待补充。
