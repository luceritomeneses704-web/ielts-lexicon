#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parse_oxford_dict.py
====================
将 DICT.zip（牛津高阶英汉双解词典 OALD 风格纯文本语料，GB18030 编码）
解析并生成 App 前端词库文件 src/data/oxfordLexicon.ts。

词条格式（每词两条起）：
    <词头行>                     如 'abandon'、'abandon (also abandonment) '
    <内容行>                     以 /音标/ 或词性开头；可含 NOTE ON USAGE 续行
    内容行结构：/ 5beIbI; `bebI/ v  1 (a) [Tn] go away from ... desert 离开...; 遗弃...: 例句 * 例句

输出格式（每条目一个管道分隔字符串，字段序）：
    ph|pos|senses|ex|en|zh|der
      ph     音标（保留牛津原记法，已去除强读式等中文注释段）
      pos    词性（如 v. / adj. / n.）
      senses 完整义项文本（编号义项 + 英英释义 + 中文释义 + 行内例句，原样保留）
      ex     精选例句，格式 en¶zh¦en¶zh（最多 2 条）
      en     英文主释义
      zh     中文主释义
      der    派生词，逗号分隔（最多 4 个）
"""

import re
import zipfile
from collections import Counter
from pathlib import Path

ZIP_PATH = Path("D:/DICT.zip")
OUT_PATH = Path("D:/ielts-lexicon/src/data/oxfordLexicon.ts")

# ---------------------------------------------------------------------------
# 1. 文本清洗：繁简转换 / 乱码 / 控制符
# ---------------------------------------------------------------------------

# 直接替换的繁体字（语料实测仅这几个，且无语境风险）
T2S_CHAR = {"於": "于", "後": "后", "麽": "么"}

# 词级修正（繁体词汇，简体有唯一对应词）
WORD_FIX = {
    "答覆": "答复",
    "回覆": "回复",
    "反覆": "反复",
    "答複": "答复",
}

# 「著」两用：显著/著名/土著/著作 保留「著」；戴著/穿著/等著 转「着」
ZHU_KEEP_PREV = set("显名土著述微")          # 前字属于这些则保留（显著、著名、土著、著述）
ZHU_KEEP_NEXT = set("名陆土作述微书录者译笔")  # 后字属于这些则保留（著名、著陆、著作…）


def clean_text(s: str) -> str:
    s = s.replace("\ufffd", "")           # GB18030 非法字节替换符
    s = s.replace("\u3000", " ")           # 表意空格
    s = s.replace("\\n", " ")              # 字面量 \n
    s = s.replace("\r", " ").replace("\t", " ")
    for k, v in WORD_FIX.items():
        s = s.replace(k, v)
    for k, v in T2S_CHAR.items():
        s = s.replace(k, v)
    # 著 -> 着（按语境）
    if "著" in s:
        out = []
        for i, ch in enumerate(s):
            if ch == "著":
                prev = s[i - 1] if i > 0 else ""
                nxt = s[i + 1] if i + 1 < len(s) else ""
                out.append("著" if (prev in ZHU_KEEP_PREV or nxt in ZHU_KEEP_NEXT) else "着")
            else:
                out.append(ch)
        s = "".join(out)
    # 分隔符转义（防与字段/配对分隔符撞车）
    s = s.replace("|", "│").replace("¦", "◆").replace("¶", "◇")
    s = re.sub(r" {2,}", " ", s)
    return s.strip()


# ---------------------------------------------------------------------------
# 2. 行分类
# ---------------------------------------------------------------------------

HEADWORD_RE = re.compile(r"^-?[A-Za-z][A-Za-z0-9 '\-,.()&/+]*$")

POS_ALT = (
    r"abbr|prefix|pref|suffix|symbol|comb form|exclam|interj|modal v|aux v|"
    r"definite article|indefinite article|number|n|v|adj|adv|prep|conj|pron|det"
)
POS_RE = re.compile(rf"^({POS_ALT})(?=[,\s.\]]|$)", re.I)
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def is_headword_candidate(line: str) -> bool:
    s = line.strip()
    if not s or len(s) > 60 or CJK_RE.search(s):
        return False
    if s.startswith("/"):
        return False
    return bool(HEADWORD_RE.match(s))


def is_content_start(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if s.startswith("/") or s.startswith("(") or s.startswith("=") or s.startswith("NOTE ON USAGE"):
        return True
    if POS_RE.match(s):
        return True
    if CJK_RE.search(s):
        return True
    return False


# ---------------------------------------------------------------------------
# 3. 词条切分（状态机）
# ---------------------------------------------------------------------------


def split_entries(lines):
    """返回 [(headword_raw, [content_line, ...]), ...]"""
    entries = []
    cur_head = None
    cur_content = []

    def flush():
        nonlocal cur_head, cur_content
        if cur_head is not None:
            entries.append((cur_head, cur_content))
        cur_head, cur_content = None, []

    i = 0
    n = len(lines)
    while i < n:
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if is_headword_candidate(line):
            # 向后看第一个非空行，判断是内容行还是又一个词头候选
            j = i + 1
            while j < n and not lines[j].strip():
                j += 1
            if j < n and is_content_start(lines[j]):
                flush()
                cur_head = line
                i += 1
                continue
            if j < n and is_headword_candidate(lines[j]):
                # 词头后紧跟词头：无内容词条，或极少数续行误判 → 作为当前词条续行容错
                if cur_head is not None:
                    cur_content.append(line)
                    i += 1
                    continue
                cur_head = line
                i += 1
                continue
            flush()
            cur_head = line
            i += 1
            continue
        else:
            if cur_head is not None:
                cur_content.append(line)
            i += 1
    flush()
    return entries


# ---------------------------------------------------------------------------
# 4. 词条字段提取
# ---------------------------------------------------------------------------

POS_NORMALIZE = {
    "n": "n.", "v": "v.", "adj": "adj.", "adv": "adv.", "prep": "prep.",
    "conj": "conj.", "pron": "pron.", "det": "det.", "abbr": "abbr.",
    "prefix": "prefix", "pref": "prefix", "suffix": "suffix", "symbol": "sym.",
    "comb form": "comb.", "exclam": "excl.", "interj": "interj.",
    "modal v": "v.", "aux v": "v.", "definite article": "art.",
    "indefinite article": "art.", "number": "num.",
}
MULTI_POS_RE = re.compile(r"^,\s*(adj|adv|n|v)(?=[,\s.\]]|$)", re.I)
# 仅提取 (also X) / (US X) / (Brit X) 形式的别名括号，避免破坏 derm(a)- 等组合形式
ALIAS_PAREN_RE = re.compile(r"\((?:also\s+((?:US\s+|Brit\s+)?[A-Za-z][A-Za-z\-]*)|(?:US|Brit)\s+([A-Za-z][A-Za-z\-]*))\)")
COMMA_SPLIT_RE = re.compile(r"^([^,]+),\s*([A-Za-z\-]+)$")


def extract_headword(head_raw: str):
    """返回 (base_display, [alias, ...], is_comma_form)"""
    base = head_raw.strip()
    aliases = []
    for m in ALIAS_PAREN_RE.finditer(base):
        alias = (m.group(1) or m.group(2) or "").strip()
        # 去掉可能残留的 US/Brit 前缀
        alias = re.sub(r"^(US|Brit)\s+", "", alias)
        if alias and len(alias) > 2:
            aliases.append(alias.lower())
        base = base.replace(m.group(0), " ")
    base = re.sub(r" {2,}", " ", base).strip()
    # 'A, a' 形式：逗号后是别名
    m = COMMA_SPLIT_RE.match(base)
    if m:
        first, second = m.group(1).strip(), m.group(2).strip()
        if len(second) > 2:
            aliases.append(second.lower())
        base = first
        return base, aliases, True
    return base, aliases, False


def clean_phonetic(ph: str) -> str:
    """去除音标内的中文注释段（强读式等），压缩空白并去重"""
    segs = [s.strip() for s in re.split(r"[;,]", ph)]
    kept = []
    for s in segs:
        if not s:
            continue
        if CJK_RE.search(s):
            s = CJK_RE.sub("", s)
            s = re.sub(r"\b(strong|weak|form|also|before)\b", "", s, flags=re.I).strip()
        if s:
            kept.append(s)
    seen, out = set(), []
    for s in kept:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return "; ".join(out)


LEADING_LABEL_RE = re.compile(r"^\s*(?:\d+\s*)?(?:\([a-z]\)\s*)?(?:\[[^\]]*\]\s*)*")
SENSE2_RE = re.compile(r"\s[2-9]\s*\[")  # 下一个编号义项起点
# 义项/子义项边界（用于截断中文释义与例句区）
BOUNDARY_STRONG_RE = re.compile(r"\s(?:\([a-z]\)|[2-9])\s(?=[A-Za-z~\[\(])")
BOUNDARY_POS_RE = re.compile(r"\s(?:n|v|adj|adv|prep|conj)\s(?=\[)")


def cut_at_boundary(s: str) -> str:
    s = BOUNDARY_STRONG_RE.split(s, maxsplit=1)[0]
    s = BOUNDARY_POS_RE.split(s, maxsplit=1)[0]
    return s


def split_en_zh(seg: str):
    """在第一个中日韩字符处切分英文/中文"""
    m = CJK_RE.search(seg)
    if not m:
        return seg.strip(), ""
    return seg[: m.start()].strip(" ,;:"), seg[m.start():].strip(" ,;:")


def split_en_zh_main(seg: str):
    """主释义切分：取第一个不在括号内的中文串作为译文起点（跳过括号内的中文注释）"""
    depth = 0
    for i, ch in enumerate(seg):
        if ch in "([（【":
            depth += 1
        elif ch in ")]）】":
            depth = max(0, depth - 1)
        elif CJK_RE.match(ch) and depth == 0:
            en, zh = seg[:i].strip(" ,;:"), seg[i:].strip(" ,;:")
            # 英文部分去掉夹带的中文（含括号注记）
            en = CJK_RE.sub("", en)
            en = re.sub(r"\(\s*\)", "", en)
            en = en.replace("（）", "")
            en = re.sub(r" {2,}", " ", en).strip(" ,;:")
            return en, zh
    return seg.strip(), ""


def parse_entry(head_raw: str, content_lines):
    text = clean_text(" ".join(content_lines))
    base, aliases, is_comma = extract_headword(head_raw)
    if not base:
        return None
    key = base.lower().strip(" .,")

    ph = ""
    m = re.match(r"^\s*/([^/]+)/", text)
    if m:
        ph = clean_phonetic(m.group(1))
        text = text[m.end():].strip()

    pos = ""
    m = POS_RE.match(text)
    if m:
        pos = POS_NORMALIZE.get(m.group(1).lower(), m.group(1) + ".")
        text = text[m.end():].strip()
        m2 = MULTI_POS_RE.match(text)
        if m2:
            extra = POS_NORMALIZE.get(m2.group(1).lower(), m2.group(1) + ".")
            if extra not in pos:
                pos = f"{pos} & {extra}"
            text = text[m2.end():].strip()

    senses = text.strip()
    if not senses:
        return None

    # 主释义：第一个义项内、例句冒号前的 英文 gloss + 中文释义
    seg1 = SENSE2_RE.split(senses, maxsplit=1)[0]
    en_part, zh_part = split_en_zh_main(seg1)
    en_part = LEADING_LABEL_RE.sub("", en_part).strip(" ,;:")
    zh_part = re.split(r"[*:]", zh_part)[0]
    zh_part = cut_at_boundary(zh_part).strip(" ,;:")
    if not zh_part:
        zh_part = en_part

    # 例句：首个冒号之后的区域，按 * 切分，取含中文的段
    ex_region = ""
    colon = senses.find(":")
    if colon != -1:
        ex_region = senses[colon + 1:]
    ex_region = cut_at_boundary(SENSE2_RE.split(ex_region, maxsplit=1)[0])
    examples = []
    for seg in ex_region.split(" * "):
        seg = seg.strip(" ,;:")
        if not seg:
            continue
        en, zh = split_en_zh(seg)
        en = LEADING_LABEL_RE.sub("", en).strip(" ,;:")
        zh = re.split(r"[*:]", zh)[0].strip(" ,;:")
        if not en or not zh:
            continue
        if re.match(r"^\d", en) or "[" in en[:4]:
            continue
        if len(en) < 8 or len(en) > 170 or len(zh) > 170:
            continue
        examples.append((en, zh))
        if len(examples) >= 2:
            break

    return {
        "key": key,
        "display": base,
        "aliases": aliases,
        "ph": ph,
        "pos": pos,
        "senses": senses[:2400],
        "en": en_part[:300],
        "zh": zh_part[:300],
        "examples": examples,
        "priority": 0 if is_comma else 1,
    }


# ---------------------------------------------------------------------------
# 5. 派生词计算
# ---------------------------------------------------------------------------

COMMON_SUFFIXES = {
    "s", "es", "ed", "d", "ing", "er", "ers", "or", "ly", "ness", "ment",
    "tion", "ation", "able", "ible", "al", "ity", "ous", "ive", "ful",
    "less", "en", "ist", "ism", "ize", "ise", "y", "ie",
    "hood", "ship", "dom", "wise", "ster", "ery", "ee", "eer",
    "ance", "ence", "age", "ary", "ory", "ify", "ic", "ical", "most", "ward",
}


def compute_derived(keys):
    """对每个词头，找出以它为词头+常见后缀的其它词头"""
    key_set = set(keys)
    derived = {}
    for w in keys:
        if len(w) < 3:
            derived[w] = []
            continue
        found = []
        for suf in COMMON_SUFFIXES:
            cand = w + suf
            if cand in key_set and cand != w:
                found.append(cand)
        found.sort(key=len)
        derived[w] = found[:4]
    return derived


# ---------------------------------------------------------------------------
# 6. 主流程
# ---------------------------------------------------------------------------


def main():
    print(f"reading {ZIP_PATH} ...")
    zf = zipfile.ZipFile(ZIP_PATH)
    txt_names = sorted(n for n in zf.namelist() if n.lower().endswith(".txt"))

    all_entries = {}   # key -> entry dict（仅真实词头）
    stats = Counter()

    for name in txt_names:
        raw = zf.read(name).decode("gb18030", errors="replace")
        for head_raw, content_lines in split_entries(raw.splitlines()):
            entry = parse_entry(head_raw, content_lines)
            if entry is None:
                stats["skipped"] += 1
                continue
            stats["parsed"] += 1
            key = entry["key"]
            existing = all_entries.get(key)
            if existing is None:
                all_entries[key] = entry
            elif entry["priority"] > existing["priority"]:
                all_entries[key] = entry  # 真实词头胜过 'A, a' 形式
            elif entry["priority"] == existing["priority"]:
                # 同词头多词性条目：合并
                if entry["pos"] and entry["pos"] not in existing["pos"]:
                    existing["pos"] = f"{existing['pos']} & {entry['pos']}" if existing["pos"] else entry["pos"]
                if not existing["ph"] and entry["ph"]:
                    existing["ph"] = entry["ph"]
                existing["senses"] = (existing["senses"] + " ｜ " + entry["senses"])[:2400]
                if not existing["examples"]:
                    existing["examples"] = entry["examples"]
                for a in entry["aliases"]:
                    if a not in existing["aliases"]:
                        existing["aliases"].append(a)
            # priority 更低 → 丢弃

    # 第二阶段：插入别名（不覆盖任何真实词头）
    alias_count = 0
    for key in list(all_entries.keys()):
        e = all_entries[key]
        for a in e["aliases"]:
            if a and a not in all_entries:
                all_entries[a] = e
                alias_count += 1

    # 第三阶段：存根条目（内容形如 '.' / '[U].' 的指针型词条）关联基础词
    stub_fixed = 0

    def find_base(k: str):
        # 副词 -ily/-ly 变形优先（desultorily -> desultory, abjectly -> abject）
        for cand in (k[:-3] + "y" if k.endswith("ily") else None,
                     k[:-2] if k.endswith("ly") else None):
            if cand and len(cand) >= 4 and cand in all_entries and all_entries[cand]["key"] == cand:
                return cand
        # 最长前缀（>=4 字符）
        for L in range(len(k) - 1, 3, -1):
            cand = k[:L]
            if cand in all_entries and all_entries[cand]["key"] == cand:
                return cand
        return None

    for key in list(all_entries.keys()):
        e = all_entries[key]
        if e["key"] != key or len(e["senses"]) >= 6:
            continue
        base = find_base(key)
        if base:
            be = all_entries[base]
            e["senses"] = f"{e['pos'] + ' ' if e['pos'] else ''}参见 {be['display']}".strip()
            if not CJK_RE.search(e["zh"]):
                e["zh"] = be["zh"]
            if len(e["en"]) < 3:
                e["en"] = be["en"]
            stub_fixed += 1
    print(f"stub entries linked to base word: {stub_fixed}")

    print(f"entries: {len(all_entries)} (parsed={stats['parsed']}, skipped={stats['skipped']}, aliases={alias_count})")

    # 派生词（仅主词头）
    real_keys = [k for k, v in all_entries.items() if v["key"] == k]
    derived = compute_derived(real_keys)
    with_derived = sum(1 for v in derived.values() if v)
    print(f"headwords: {len(real_keys)}, with derived forms: {with_derived}")

    # 数据质量统计
    no_ph = sum(1 for k in real_keys if not all_entries[k]["ph"])
    no_pos = sum(1 for k in real_keys if not all_entries[k]["pos"])
    no_ex = sum(1 for k in real_keys if not all_entries[k]["examples"])
    print(f"quality: no-phonetic={no_ph}, no-pos={no_pos}, no-example={no_ex}")

    # 生成 TS
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines_out = [
        "// AUTO-GENERATED by scripts/parse_oxford_dict.py from OALD corpus (DICT.zip).",
        "// 牛津高阶英汉双解词典（OALD 风格）真实词库 — 请勿手工编辑。",
        "//",
        "// 每条目为一个管道分隔字符串，字段序：",
        "//   显示词头|音标|词性|义项全文|例句|英文主释义|中文主释义|派生词",
        "//   例句内以 ¦ 分隔多条、¶ 分隔英文与中文；派生词以逗号分隔。",
        "",
        "export interface OxfordLexiconEntry {",
        "  /** 显示词头（保留原始大小写） */",
        "  display: string;",
        "  /** 音标（保留牛津原记法） */",
        "  ph: string;",
        "  /** 词性，如 v. / adj. / n. */",
        "  pos: string;",
        "  /** 完整义项文本（编号义项 + 英英释义 + 中文释义 + 行内例句） */",
        "  senses: string;",
        "  /** 精选例句 [英文, 中文][] */",
        "  ex: Array<[string, string]>;",
        "  /** 英文主释义 */",
        "  en: string;",
        "  /** 中文主释义 */",
        "  zh: string;",
        "  /** 派生词 */",
        "  der: string[];",
        "}",
        "",
        "export const OXFORD_LEXICON: Record<string, string> = {",
    ]
    total_bytes = 0
    for key in sorted(all_entries.keys()):
        e = all_entries[key]
        ex_str = "¦".join(f"{en}¶{zh}" for en, zh in e["examples"])
        der_str = ",".join(derived.get(e["key"], []))
        raw = "|".join([e["display"], e["ph"], e["pos"], e["senses"], ex_str, e["en"], e["zh"], der_str])
        total_bytes += len(raw) + len(key) + 6
        esc_key = key.replace("\\", "\\\\").replace("'", "\\'")
        esc_val = raw.replace("\\", "\\\\").replace("'", "\\'")
        lines_out.append(f"  '{esc_key}': '{esc_val}',")
    lines_out.append("};")
    lines_out.append("")

    OUT_PATH.write_text("\n".join(lines_out), encoding="utf-8")
    size_mb = OUT_PATH.stat().st_size / 1024 / 1024
    print(f"written: {OUT_PATH}  ({size_mb:.1f} MB, payload ~{total_bytes/1024/1024:.1f} MB)")

    # 样例自检
    for probe in ("abandon", "baby", "above", "ache", "a fortiori", "a", "A"):
        e = all_entries.get(probe)
        if e:
            print(f"  [{probe}] display='{e['display']}' ph='{e['ph']}' pos='{e['pos']}' "
                  f"en='{e['en'][:50]}' zh='{e['zh'][:30]}' der={derived.get(probe)}")
        else:
            print(f"  [{probe}] MISSING")


if __name__ == "__main__":
    main()
