# 明日方舟抽卡模拟器（Arknights Gacha Simulator）

![version](https://img.shields.io/badge/version-v12.40-blue) ![banners](https://img.shields.io/badge/卡池-443-orange) ![ops](https://img.shields.io/badge/干员-409-brightgreen) ![license](https://img.shields.io/badge/license-MIT-lightgrey)

> 单文件 HTML 的明日方舟抽卡模拟器 · 自选历史卡池 · 干员立绘 · 抽卡统计 · 皮肤图鉴

## ✨ 功能特性

| 类别 | 功能 |
|------|------|
| 🎴 卡池 | 442 个历史卡池：限时 / 标准 / 中坚 / 联合行动 / 定向甄选 / 中坚甄选 / 特殊 · 卡池倒计时 |
| 🧑🚀 干员 | 409 名干员，精二立绘在线加载并本地缓存（IndexedDB），皮肤图鉴实时查询 bilibili Wiki（30天缓存秒开） |
| 🎯 概率 | 6★ 2% 基础 · 50 抽后递增 · 100 抽必出 · 10 连保底 5★+ · 官方 UP 规则 |
| ⭐ 自选 UP | 定向甄选 / 中坚甄选卡池可自选 UP 干员（最少保留规则） |
| 📊 统计 | 欧气评分（等级徽章）· 六星间隔 · UP 命中率 · 每月统计 · 每日出货 · 热力图 · 时段 · 保底总览 · 等价合成玉 · 限定图鉴完成度 · 限定/6★缺卡清单 |
| 🧪 模拟 | 独立保底模拟（垫刀起始进度 · UP命中统计 · 10次分布 · 与真实对比），绝不污染存档 |
| 📖 Wiki | 属性/技能/材料/模组/档案/密录/语音（多语言台词复制）实时同步 PRTS · 六重回退自动获取（JSONP/CORS/多级代理）· 进度提示 · 分节缓存 · 搜索候选 · 双干员对比 |
| 🧱 材料 | 材料刷取查询：内置 bilibili Wiki 官方掉落数据（固定/概率/小概率/基建生产）与**真实图标**（断网可用）· 分类筛选 · 掉落关卡数 · 合成配方 · PRTS 实时同步增强 |
| 💝 心愿单 | 标记想要干员，抽到自动提醒并移除 |
| 🏆 成就 | 24 项成就（限定收藏家 / 全图鉴 / 联动干员 / 井中月 / 六星军团…）+ 进度条 |
| 📱 移动端 | 抽屉式卡池选择 · 底部操作栏 · iOS 安全区适配 |
| 💾 数据 | 抽卡记录 CSV（全量/当前筛选）· 卡池清单 · 存档导出(文件)/导入(文件拖拽+备份恢复) · 各卡池6★率排行 |
| ⌨️ 快捷键 | 1 单抽 · 2 十连 · 3 抽到6★ · ←/→ 切卡池 · F 收藏 · G 画廊 · S 统计 · H 记录 · W 心愿 · P 保底 |

## 🚀 使用方法

直接打开 `抽卡模拟器.html` 即可使用（需联网加载干员立绘与皮肤）。

## 📦 发布资源

每个版本提供 `akgacha_vX.Y.zip`：包含成品 HTML、源码、数据与文档，见 [Releases](https://github.com/wayileina114-bit/ak-gacha-simulator/releases)。

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