#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""西语人工精校表（覆盖规则推导，优先级最高）。

只放「闭集」和「规则推导必定出错」的高价值词：
星期、月份、季节、基数词、颜色、常见国名、亲属称谓、
以及由 gloss 是「given name / surname」这类元信息导致释义缺失的人名。
"""

# ---------------- 星期 ----------------
DIAS = {
    'lunes': '星期一', 'martes': '星期二', 'miércoles': '星期三',
    'jueves': '星期四', 'viernes': '星期五', 'sábado': '星期六',
    'domingo': '星期日；星期天（也作人名「多明戈」）',
}

# ---------------- 月份 ----------------
MESES = {
    'enero': '一月', 'febrero': '二月', 'marzo': '三月', 'abril': '四月',
    'mayo': '五月', 'junio': '六月', 'julio': '七月', 'agosto': '八月',
    'septiembre': '九月', 'setiembre': '九月', 'octubre': '十月',
    'noviembre': '十一月', 'diciembre': '十二月',
}

# ---------------- 季节 ----------------
ESTACIONES = {
    'primavera': '春天；春季', 'verano': '夏天；夏季',
    'otoño': '秋天；秋季', 'invierno': '冬天；冬季',
}

# ---------------- 基数词 ----------------
NUMEROS = {
    'cero': '零', 'uno': '一', 'una': '一（阴性）', 'dos': '二', 'tres': '三',
    'cuatro': '四', 'cinco': '五', 'seis': '六', 'siete': '七', 'ocho': '八',
    'nueve': '九', 'diez': '十', 'once': '十一', 'doce': '十二', 'trece': '十三',
    'catorce': '十四', 'quince': '十五', 'dieciséis': '十六', 'diecisiete': '十七',
    'dieciocho': '十八', 'diecinueve': '十九', 'veinte': '二十',
    'treinta': '三十', 'cuarenta': '四十', 'cincuenta': '五十',
    'sesenta': '六十', 'setenta': '七十', 'ochenta': '八十', 'noventa': '九十',
    'cien': '一百', 'ciento': '一百', 'mil': '一千', 'millón': '百万',
}

# ---------------- 颜色 ----------------
COLORES = {
    'rojo': '红色；红的', 'azul': '蓝色；蓝的', 'verde': '绿色；绿的',
    'amarillo': '黄色；黄的', 'negro': '黑色；黑的', 'blanco': '白色；白的',
    'gris': '灰色；灰的', 'naranja': '橙色；橙子', 'morado': '紫色；紫的',
    'rosa': '粉红色；玫瑰', 'marrón': '棕色；褐色的', 'violeta': '紫罗兰色',
    'celeste': '天蓝色', 'dorado': '金色的；镀金的', 'plateado': '银色的',
}

# ---------------- 常见国家 / 地区 ----------------
PAISES = {
    'españa': '西班牙', 'francia': '法国', 'italia': '意大利', 'alemania': '德国',
    'portugal': '葡萄牙', 'china': '中国', 'japón': '日本', 'corea': '韩国',
    'méxico': '墨西哥', 'argentina': '阿根廷', 'brasil': '巴西', 'chile': '智利',
    'perú': '秘鲁', 'colombia': '哥伦比亚', 'venezuela': '委内瑞拉',
    'ecuador': '厄瓜多尔', 'bolivia': '玻利维亚', 'uruguay': '乌拉圭',
    'paraguay': '巴拉圭', 'cuba': '古巴', 'rusia': '俄罗斯',
    'canadá': '加拿大', 'india': '印度', 'australia': '澳大利亚',
    'grecia': '希腊', 'egipto': '埃及', 'marruecos': '摩洛哥',
    'irlanda': '爱尔兰', 'holanda': '荷兰', 'suiza': '瑞士',
    'suecia': '瑞典', 'noruega': '挪威', 'polonia': '波兰', 'turquía': '土耳其',
    'estados unidos': '美国', 'reino unido': '英国', 'gran bretaña': '英国',
    'américa': '美洲；美国', 'europa': '欧洲', 'asia': '亚洲', 'áfrica': '非洲',
    'madrid': '马德里（西班牙首都）', 'barcelona': '巴塞罗那',
    'valencia': '巴伦西亚', 'sevilla': '塞维利亚', 'granada': '格拉纳达',
    'bilbao': '毕尔巴鄂', 'málaga': '马拉加', 'toledo': '托莱多',
    'lisboa': '里斯本', 'parís': '巴黎', 'roma': '罗马', 'londres': '伦敦',
    'berlín': '柏林', 'nueva york': '纽约', 'buenos aires': '布宜诺斯艾利斯',
}

# ---------------- 亲属称谓 ----------------
FAMILIA = {
    'padre': '父亲；爸爸', 'madre': '母亲；妈妈', 'hijo': '儿子',
    'hija': '女儿', 'hermano': '兄弟；哥哥；弟弟', 'hermana': '姐妹；姐姐；妹妹',
    'abuelo': '祖父；外祖父', 'abuela': '祖母；外祖母',
    'tío': '叔叔；舅舅；伯伯', 'tía': '阿姨；姑姑；婶婶',
    'primo': '表兄弟；堂兄弟', 'prima': '表姐妹；堂姐妹',
    'esposo': '丈夫', 'esposa': '妻子', 'marido': '丈夫', 'mujer': '女人；妻子',
    'hombre': '男人；人', 'nieto': '孙子；外孙', 'nieta': '孙女；外孙女',
    'suegro': '岳父；公公', 'suegra': '岳母；婆婆', 'sobrino': '侄子；外甥',
    'sobrina': '侄女；外甥女',
}

# ---------------- gloss 元信息词表 ----------------
# gloss 是「词条元信息」而不是「词义」时，直接给出中文，不去查词典（查了也是垃圾）
META_GLOSS = [
    (r'^given name$', '人名（男子名／女子名）'),
    (r'^surname$', '姓氏'),
    (r'^(?:proper )?name$', '名字；名称'),
    (r'^letter\b', '字母'),
    (r'^the letter ([a-z]) in the spanish alphabet$', None),   # 处理见下
    (r'^abbreviation(?: of)?\b', '缩写'),
    (r'^diminutive of\b', '指小词'),
    (r'^augmentative of\b', '增义词'),
    (r'^feminine of\b', '阴性形式'),
    (r'^masculine of\b', '阳性形式'),
    (r'^plural of\b', '复数形式'),
    (r'^singular of\b', '单数形式'),
    (r'^alternative form of\b', '异体写法'),
    (r'^synonym of\b', '同义词'),
    (r'^inflection of\b', '变形'),
    (r'^participle of\b', '分词形式'),
    (r'^gerund of\b', '动名词形式'),
    (r'^past participle of\b', '过去分词'),
    (r'^present participle of\b', '现在分词'),
    (r'^first-person\b', '第一人称变位'),
    (r'^third-person\b', '第三人称变位'),
    (r'^second-person\b', '第二人称变位'),
    (r'^used to\b', '用于'),
    (r'^a surname$', '姓氏'),
    (r'^a given name$', '人名'),
]


def all_curated() -> dict:
    """合并所有精校表（后面的覆盖前面的）"""
    out = {}
    for tbl in (NUMEROS, COLORES, DIAS, MESES, ESTACIONES, PAISES, FAMILIA):
        out.update(tbl)
    return out


if __name__ == '__main__':
    d = all_curated()
    print(f'精校条数 {len(d)}')
    for k in list(d)[:10]:
        print(f'  {k} → {d[k]}')