# IELTS Lexicon · 雅思 / 西语极简词典

一个放在浏览器里的双语查词工具：英语雅思词库 + 西班牙语词库，支持生词本、记忆卡片、例句点查。

## 在线使用

**https://luceritomeneses704-web.github.io/ielts-lexicon/**

手机、平板、电脑浏览器直接打开，无需安装。

## 功能

### 英语词典
- 雅思核心词库 + 剑桥真题语料 + 牛津高阶（约 4.6 万词）
- 标准 IPA 音标（牛津旧式音标已转换为国际音标）
- 剑桥雅思真题例句与中文译文
- 学术同义替换词、派生词跳转

### 西语词典（为中文母语初学者设计）
- 19,583 个高频词，按词频排序
- **重音不敏感输入**：`dias` 也能搜到 `días`，`manana` → `mañana`，`nino` → `niño`
- **字母模糊联想**：`b/v`、`s/z`、`g(e,i)/j`、`ll/y`、`c/qu/k` 同族互认，`h` 静默忽略
- **变形自动还原**：`días → día`、`hablo → hablar`、`estás → estar`、`niños → niño`
- **中文释义**：核心高频词人工精校中文
- **多条例句**：高频词 5 条西英对照句
- **固定搭配**：`tener hambre`、`hacer falta` 等 300+ 条精校短语
- **例句点查**：点句中任意单词，原位弹出释义气泡，不跳页
- **朗读中文 / 朗读西语**

### 通用
- 生词本（按词典隔离存储）、分组、记忆卡片
- 查词自动收录、收藏、掌握度标记
- 全局快捷键 `/` 或 `Ctrl+K` 聚焦搜索框

## 本地运行

```bash
npm install
npm run dev        # 开发模式
npm run build      # 生产构建（输出到 dist/）
```

也可以直接跑 `start-app.cmd`（Windows）启动生产模式服务。

## 数据来源

| 数据 | 来源 | 许可 |
|---|---|---|
| 西语词库 | [spanish_data-master](https://github.com/)（Wiktionary es-en + FrequencyWords） | CC-BY-SA |
| 西语例句 | [Tatoeba](https://tatoeba.org/) | CC-BY 2.0 FR |
| 英语词库 | 自建雅思词表 + 牛津高阶词条 | — |

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS

词库按需加载：首屏约 372 KB，西语词库 5.6 MB / 牛津词库 20 MB 均为独立 chunk，切换词典时才下载。

## 数据生成脚本

`scripts/` 下保留了从原始数据包重新生成词库的完整链路：

```bash
# 西语词库（需 D:\spanish_data-master.zip）
python scripts/parse_spanish.py
python scripts/gen_spanish_ts.py

# 词汇真经词库（需 PDF）
python scripts/parse_zhenjing.py
python scripts/gen_zhenjing_ts.py
```

中文释义映射在 `scripts/es_zh_map.py`，可直接增删词条后重新生成。

## License

代码 MIT。词库数据遵循上游 CC-BY-SA / CC-BY 许可。
