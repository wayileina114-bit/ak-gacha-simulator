# 明日方舟抽卡模拟器（Arknights Gacha Simulator）

![version](https://img.shields.io/badge/version-v8.2-blue) ![banners](https://img.shields.io/badge/卡池-442-orange) ![ops](https://img.shields.io/badge/干员-409-brightgreen) ![license](https://img.shields.io/badge/license-MIT-lightgrey)

> 单文件 HTML 的明日方舟抽卡模拟器 · 自选历史卡池 · 干员立绘 · 抽卡统计 · 皮肤图鉴

## ✨ 功能特性

| 类别 | 功能 |
|------|------|
| 🎴 卡池 | 442 个历史卡池：限时 / 标准 / 中坚 / 联合行动 / 定向甄选 / 中坚甄选 / 特殊 |
| 🧑🚀 干员 | 409 名干员，精二/初始立绘在线加载，皮肤图鉴实时查询 bilibili Wiki |
| 🎯 概率 | 6★ 2% 基础 · 50 抽后递增 · 100 抽必出 · 10 连保底 5★+ · 官方 UP 规则 |
| ⭐ 自选 UP | 定向甄选 / 中坚甄选卡池可自选 UP 干员（最少保留规则） |
| 📊 统计 | 欧气评分（等级徽章）· 六星间隔 · UP 命中率 · 每月统计 · 每日出货 · 热力图 · 时段 · 保底总览 · 等价合成玉 · 限定图鉴完成度 · 限定/6★缺卡清单 |
| 💝 心愿单 | 标记想要干员，抽到自动提醒并移除 |
| 🏆 成就 | 12 项成就（限定收藏家 / 全图鉴 / 五星常客 / 深度博士）+ 进度条 |
| 📱 移动端 | 抽屉式卡池选择 · 底部操作栏 · iOS 安全区适配 |
| 💾 数据 | 抽卡记录 CSV（含卡池列）· 卡池清单 · 存档导入/导出 · 卡池6★率统计 |
| ⌨️ 快捷键 | 1 单抽 · 2 十连 · 3 抽到6★ · ←/→ 切卡池 · F 收藏 · 🎲 随机干员 |

## 🚀 使用方法

直接打开 `抽卡模拟器.html` 即可使用（需联网加载干员立绘与皮肤）。

## 📦 发布资源

每个版本提供 `akgacha_vX.Y.zip`：包含成品 HTML、源码、数据与文档，见 [Releases](https://github.com/wayileina114-bit/ak-gacha-simulator/releases)。

## 🔗 真实寻访记录（后端自动获取）

在 HTML 的「真实寻访记录 → 后端自动获取」中可连接本地后端自动拉取游戏抽卡记录：

```bash
node server/index.js        # 启动本地服务（默认端口 8723）
```

- 方式一：粘贴游戏内获取的 token → 自动换取凭证并拉取记录
- 方式二：鹰角账号密码登录 → 自动获取凭证与记录
- 接口：/api/ping 连接测试 · /api/login 账号登录 · /api/grant 换取凭证 · /api/gacha 拉取记录
- ⚠️ 说明：鹰角官方接口为社区逆向公开，端点/签名可能随游戏版本变动（集中在 server/index.js 顶部常量，便于更新）；仅请查询本人账号，勿高频请求。

## 🛠️ 本地构建

```bash
node build_all.js    读取 data/*.json 重新生成 抽卡模拟器.html
node fix_parser3.js （可选）从 PRTS 重新抓取卡池数据
```

## 📁 目录结构

```
抽卡模拟器.html   成品（单文件，数据内嵌）
app_part1.html    结构 + 样式源码
app_part2.js      全部应用逻辑
build_all.js      构建脚本（注入数据生成成品）
fix_parser3.js    PRTS 卡池数据解析器
data/             banners.json（442卡池）· ops_urls.json（409干员）· 原始抓取数据
CHANGELOG.md      更新日志
```

## 📊 数据来源

- 卡池/干员数据：PRTS Wiki（更新至 2026-08-29）
- 干员立绘/皮肤：bilibili Wiki
- 概率按官方规则模拟，仅供娱乐

## 📄 License

MIT