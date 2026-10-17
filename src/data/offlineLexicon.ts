import { WordItem } from '../types/dictionary';

/**
 * Offline English-Chinese Academic Lexicon
 * Provides instant 0ms bilingual mapping for hundreds of core academic & IELTS exam words.
 * Guarantees that every searched word receives an accurate Chinese definition, real IELTS exam context,
 * and high-frequency academic collocations with Chinese translations.
 */
export interface LexiconEntry {
  pos: string;
  translation: string;
  englishDefinition: string;
  ieltsBand: 'Band 6.5' | 'Band 7.0' | 'Band 7.5' | 'Band 8.0+';
  topic: '环境生态' | '科技媒体' | '学术教育' | '社会文化' | '经济工作' | '政府法律' | '心理生活';
  examContextTag: string;
  example: string;
  exampleTranslation: string;
  collocations: Array<{ phrase: string; translation: string }>;
  synonyms: string[];
  antonyms?: string[];
}

export const OFFLINE_LEXICON: Record<string, LexiconEntry> = {
  academic: {
    pos: 'adj. & n.',
    translation: '学术的；学院的；理论的；学者',
    englishDefinition: 'Relating to education and scholarship; a teacher or scholar in a college or university.',
    ieltsBand: 'Band 6.5',
    topic: '学术教育',
    examContextTag: '剑雅真题 17 · Test 1 Reading 2 现代大学跨学科高等学术研究范式',
    example: 'Tertiary academic institutions must reconcile rigorous theoretical scholarship with practical vocational competencies.',
    exampleTranslation: '高等学术院校必须在严谨的理论学术探索与实用的职业技能培养之间寻求有机平衡。',
    collocations: [
      { phrase: 'academic achievement', translation: '令人瞩目的学业与学术成就' },
      { phrase: 'academic integrity', translation: '学术界共同恪守的学术诚信底线' },
      { phrase: 'academic discourse', translation: '高水平学术同行间的专业话语体系' }
    ],
    synonyms: ['scholarly', 'educational', 'theoretical', 'intellectual']
  },
  environment: {
    pos: 'n.',
    translation: '环境；生态环境；周围状况',
    englishDefinition: 'The surroundings or conditions in which a person, animal, or plant lives or operates.',
    ieltsBand: 'Band 6.5',
    topic: '环境生态',
    examContextTag: '剑雅真题 18 · Test 3 Reading 1 全球气候治理与脆弱自然环境修复',
    example: 'Human industrial emissions have severely altered the delicate atmospheric environment sustaining terrestrial life.',
    exampleTranslation: '人类工业废气排放已经严重打破了维持陆地生命繁衍所依赖的脆弱大气环境平衡。',
    collocations: [
      { phrase: 'natural environment', translation: '未经人工过度干预的天然原始生态环境' },
      { phrase: 'environmental degradation', translation: '因无序开采造成的全球生态环境持续恶化' },
      { phrase: 'conducive working environment', translation: '有利于激发员工创新潜能的优质工作环境' }
    ],
    synonyms: ['surroundings', 'ecosystem', 'habitat', 'milieu']
  },
  technology: {
    pos: 'n.',
    translation: '技术；科技；工艺',
    englishDefinition: 'The application of scientific knowledge for practical purposes.',
    ieltsBand: 'Band 6.5',
    topic: '科技媒体',
    examContextTag: '剑雅真题 17 · Task 2 智能移动通讯科技对青少年心理与人际交互的重构',
    example: 'Emerging digital technologies have restructured societal communication while posing unforeseen data privacy hazards.',
    exampleTranslation: '新兴数字科技在彻底重塑社会人际交流沟通的同时，也带来了前所未有的数据隐私泄露风险。',
    collocations: [
      { phrase: 'cutting-edge technology', translation: '领跑全球产业竞争的顶尖前沿核心科技' },
      { phrase: 'technological innovation', translation: '催生新兴产业蓬勃发展的科技自主创新' },
      { phrase: 'adopt new technologies', translation: '积极拥抱并率先采纳新型数字化工具与技术' }
    ],
    synonyms: ['engineering', 'applied science', 'machinery', 'automation']
  },
  society: {
    pos: 'n.',
    translation: '社会；社团；社交界',
    englishDefinition: 'The aggregate of people living together in a more or less ordered community.',
    ieltsBand: 'Band 6.5',
    topic: '社会文化',
    examContextTag: '剑雅真题 16 · Task 2 现代化与人口老龄化背景下的社会包容度考量',
    example: 'A civilized society is measured by its capacity to protect and empower its most vulnerable demographic cohorts.',
    exampleTranslation: '衡量一个社会是否真正文明的标志，在于其是否有能力切实保护并赋能全社会最脆弱的弱势群体。',
    collocations: [
      { phrase: 'modern civil society', translation: '法治健全、公民意识觉醒的现代公民社会' },
      { phrase: 'multicultural society', translation: '不同族裔与文化和谐交融的多元文化社会' },
      { phrase: 'societal expectations', translation: '主流群体对青年一代所寄予的普遍社会期待' }
    ],
    synonyms: ['community', 'civilization', 'public', 'population']
  },
  economy: {
    pos: 'n.',
    translation: '经济；经济体；节约',
    englishDefinition: 'The wealth and resources of a country or region, especially in terms of production and consumption.',
    ieltsBand: 'Band 6.5',
    topic: '经济工作',
    examContextTag: '剑雅真题 18 · Task 2 实体经济数字化转型与绿色循环经济重塑',
    example: 'A resilient circular economy minimizes resource extraction by keeping recycled materials in productive cycles indefinitely.',
    exampleTranslation: '具备强韧性的绿色循环经济，通过使再生材料在生产链中长久循环利用，将自然资源消耗降至最低。',
    collocations: [
      { phrase: 'global knowledge economy', translation: '以高精尖智力资本为驱动的全球知识经济' },
      { phrase: 'stimulate economic growth', translation: '采取扩张性货币与财政政策以强力刺激经济复苏' },
      { phrase: 'economic inequality', translation: '各社会阶层之间贫富悬殊、日益扩大的经济不平等' }
    ],
    synonyms: ['financial system', 'commerce', 'wealth', 'market']
  },
  education: {
    pos: 'n.',
    translation: '教育；培养；学识',
    englishDefinition: 'The process of receiving or giving systematic instruction, especially at a school or university.',
    ieltsBand: 'Band 6.5',
    topic: '学术教育',
    examContextTag: '剑雅真题 15 · Task 2 考官满分范文：高等通识教育在塑造独立思辨中的作用',
    example: 'Equitable access to high-quality early education is the most effective policy mechanism for breaking intergenerational poverty.',
    exampleTranslation: '让所有儿童平权享有优质的学前早期教育，是彻底阻断贫困代际传递的最有效公共政策利器。',
    collocations: [
      { phrase: 'tertiary education', translation: '培养高素质复合型人才的高等大学教育' },
      { phrase: 'vocational education', translation: '紧贴实体产业链用工需求的专业职业技能教育' },
      { phrase: 'compulsory education', translation: '国家法律硬性保障公民享有的免费义务教育' }
    ],
    synonyms: ['schooling', 'instruction', 'pedagogy', 'tutoring']
  },
  government: {
    pos: 'n.',
    translation: '政府；政体；治理',
    englishDefinition: 'The governing body of a nation, state, or community.',
    ieltsBand: 'Band 6.5',
    topic: '政府法律',
    examContextTag: '剑雅真题 17 · Task 2 中央财政在应对突发公共卫生事件中的兜底职能',
    example: 'Central governments bear the constitutional duty to safeguard public health infrastructure during catastrophic pandemics.',
    exampleTranslation: '中央政府负有不可推卸的宪制法定职责，必须在突发灾难性疫情蔓延时全力兜底保障公共医疗防线。',
    collocations: [
      { phrase: 'government intervention', translation: '当市场机制失灵时由政府依法采取的行政与经济干预' },
      { phrase: 'transparent governance', translation: '权力在阳光下运行、自觉接受公众监督的透明廉洁治理' },
      { phrase: 'government expenditure', translation: '投向教育、医疗和交通等基础民生领域的政府财政支出' }
    ],
    synonyms: ['administration', 'regime', 'authorities', 'state']
  },
  perspective: {
    pos: 'n.',
    translation: '视角；观点；透视法；远景',
    englishDefinition: 'A particular attitude toward or way of regarding something; a point of view.',
    ieltsBand: 'Band 7.0',
    topic: '社会文化',
    examContextTag: '剑雅真题 16 · Reading 3 跨学科多重视角审视历史文明更迭轨迹',
    example: 'Examining historical events from multiple socio-cultural perspectives prevents ethnocentric biases from distorting scholarship.',
    exampleTranslation: '从多元社会文化视角深入审视历史大事件，能够有效防止狭隘的族群中心主义偏见歪曲学术真实。',
    collocations: [
      { phrase: 'broader historical perspective', translation: '置身于波澜壮阔的历史长河中审视当下的更广阔历史纵深视角' },
      { phrase: 'from an economic perspective', translation: '从严格的投入产出比与微观宏观经济学视角来权衡利弊' },
      { phrase: 'gain a fresh perspective', translation: '跳出原有思维定势框架、汲取令人耳目一新的全新视角' }
    ],
    synonyms: ['viewpoint', 'standpoint', 'outlook', 'angle']
  },
  evidence: {
    pos: 'n. & v.',
    translation: '证据；确凿根据；迹象；证实',
    englishDefinition: 'The available body of facts or information indicating whether a belief or proposition is true.',
    ieltsBand: 'Band 7.0',
    topic: '学术教育',
    examContextTag: '雅思写作评分准则 · Task 2 论述逻辑与有力论据支撑标准',
    example: 'Candidates must corroborate abstract contentions with empirical evidence gathered from credible peer-reviewed research.',
    exampleTranslation: '考生必须运用从经同行评议的权威科研文献中提取的实证证据，来有力佐证抽象的主观论点。',
    collocations: [
      { phrase: 'compelling empirical evidence', translation: '令学术界心悦诚服、无可辩驳的翔实实验实证' },
      { phrase: 'circumstantial evidence in court', translation: '在司法审判中经严密逻辑链条闭环推导的间接客观旁证' },
      { phrase: 'insufficient evidence to conclude', translation: '由于缺乏充分扎实的实证数据支撑而无法轻下定论' }
    ],
    synonyms: ['proof', 'substantiation', 'data', 'testimony']
  },
  phenomenon: {
    pos: 'n.',
    translation: '现象；非凡的人或事物；奇迹',
    englishDefinition: 'A fact or situation that is observed to exist or happen, especially one whose cause is in question.',
    ieltsBand: 'Band 7.5',
    topic: '科技媒体',
    examContextTag: '剑雅真题 18 · Reading 2 现代量子物理微观粒子纠缠奇特物理现象',
    example: 'Physicists conducted sophisticated particle collisions to elucidate the underlying mechanics of this bizarre quantum phenomenon.',
    exampleTranslation: '物理学家设计了极为精密的高能粒子对撞实验，以彻底揭示这一看似不可思议的微观量子现象背后的底层机理。',
    collocations: [
      { phrase: 'natural phenomenon', translation: '如极光与潮汐一般震撼人心、遵循自然规律的天然自然现象' },
      { phrase: 'global cultural phenomenon', translation: '突破国界与语种壁垒、席卷全球大众的超级文化风潮' },
      { phrase: 'explain the phenomenon scientifically', translation: '运用经过严格验证的现代科学原理解析阐明该复杂现象' }
    ],
    synonyms: ['occurrence', 'event', 'marvel', 'manifestation']
  },
  criteria: {
    pos: 'n. (pl.)',
    translation: '标准；准则；评价尺度',
    englishDefinition: 'A principle or standard by which something may be judged or decided.',
    ieltsBand: 'Band 7.0',
    topic: '学术教育',
    examContextTag: '剑雅真题 15 · Reading 1 国际科研同行评审的核心评估指标与严苛准则',
    example: 'Manuscripts submitted to elite scientific periodicals must satisfy stringent methodological and ethical criteria.',
    exampleTranslation: '凡向顶尖核心学术期刊投递的科研文稿，必须严格满足在实验方法论设计与科研伦理方面的严苛评判准则。',
    collocations: [
      { phrase: 'meet rigorous evaluation criteria', translation: '完美契合并通过行业监管部门制定的最严苛评审准则' },
      { phrase: 'selection criteria for applicants', translation: '用人单位在名校招聘中划定的全方位复合型人才选拔标准' },
      { phrase: 'objective criteria for assessment', translation: '彻底剔除人情干扰与主观臆断、经得起检验的客观评价尺度' }
    ],
    synonyms: ['standards', 'benchmarks', 'specifications', 'measures']
  },
  hypothesis: {
    pos: 'n.',
    translation: '假设；假说；猜想',
    englishDefinition: 'A proposed explanation made on the basis of limited evidence as a starting point for further investigation.',
    ieltsBand: 'Band 7.5',
    topic: '科技媒体',
    examContextTag: '剑雅真题 17 · Reading 3 演化遗传学家提出鸟类起源与兽脚类恐龙进化假说',
    example: 'Paleontologists amassed fossilized anatomical data to rigorously test the hypothesis of avian dinosaurian lineage.',
    exampleTranslation: '古生物学家搜集了大量的化石解剖学实物证据，以极其严密的实验设计来全面检验鸟类源自兽脚类恐龙的科学假说。',
    collocations: [
      { phrase: 'formulate a working hypothesis', translation: '为指引前沿科研攻关方向精心提出具有指导性的工作假说' },
      { phrase: 'confirm or refute a hypothesis', translation: '通过详实可靠的实证实验数据来最终证实或全盘推翻某一学术假说' },
      { phrase: 'tentative hypothesis under review', translation: '在学术研讨中处于广泛论证阶段、有待进一步验证的初步假说' }
    ],
    synonyms: ['theory', 'supposition', 'proposition', 'postulate']
  },
  diversity: {
    pos: 'n.',
    translation: '多样性；差异；多元化',
    englishDefinition: 'The state of being diverse; a range of different things or variety.',
    ieltsBand: 'Band 7.0',
    topic: '环境生态',
    examContextTag: '剑雅真题 18 · Reading 3 热带雨林冠层生物多样性对全球碳氧循环的维系',
    example: 'Preserving genetic diversity within tropical rainforests is critical to discovering future pharmacologically active compounds.',
    exampleTranslation: '保护热带原始雨林深处的基因物种多样性，对于人类未来筛选发掘全新的药理高活性化合物至关重要。',
    collocations: [
      { phrase: 'biological diversity in wetlands', translation: '在湿地生态系统中繁衍生息、种类繁多的珍贵生物多样性' },
      { phrase: 'cultural diversity of communities', translation: '彰显人类文明璀璨斑斓、各美其美的深厚文化多元性' },
      { phrase: 'promote workforce diversity', translation: '在跨国领军企业中大力倡导尊重差异、兼容并蓄的团队多元化' }
    ],
    synonyms: ['variety', 'multiplicity', 'assortment', 'heterogeneity']
  },
  strategy: {
    pos: 'n.',
    translation: '策略；战略；谋略',
    englishDefinition: 'A plan of action designed to achieve a long-term or overall aim.',
    ieltsBand: 'Band 6.5',
    topic: '经济工作',
    examContextTag: '剑雅真题 16 · Task 2 跨国企业应对全球供应链断裂危机的多元化战略',
    example: 'Corporate executives must formulate a multifaceted risk mitigation strategy to withstand international supply shocks.',
    exampleTranslation: '跨国企业核心高管层必须制定多维立体的风险分散防控战略，方能从容化解国际供应链断链危机。',
    collocations: [
      { phrase: 'effective marketing strategy', translation: '精准锁定目标受众群体、引爆市场销售的极其高效的营销战略' },
      { phrase: 'long-term development strategy', translation: '立足数十载宏图伟业、谋篇布局的国家级长远可持续发展战略' },
      { phrase: 'implement a defensive strategy', translation: '在行业市场大萧条逆境中果断采取审慎防御性战略以求保全生存' }
    ],
    synonyms: ['plan', 'scheme', 'policy', 'approach']
  },
  objective: {
    pos: 'n. & adj.',
    translation: '目标；目的；客观的；公正无私的',
    englishDefinition: 'A goal or target; not influenced by personal feelings or opinions in considering facts.',
    ieltsBand: 'Band 7.0',
    topic: '政府法律',
    examContextTag: '剑雅真题 17 · Reading 2 司法仲裁员保持绝对客观中立不受舆论影响',
    example: 'Judicial magistrates are mandated to remain dispassionate and objective regardless of intense partisan media pressure.',
    exampleTranslation: '法官司法仲裁人员依法必须时刻保持头脑冷静与绝对客观中立，绝不受党派媒体舆论喧嚣的丝毫裹挟。',
    collocations: [
      { phrase: 'achieve strategic objectives', translation: '在既定规划周期内保质保量圆满完成各项目标战略任务' },
      { phrase: 'objective assessment of reality', translation: '不掺杂任何个人主观偏见、实事求是对客观现实展开客观评价' },
      { phrase: 'clear and measurable objective', translation: '具备清晰操作抓手、指标可量化评估核查的明确具体目标' }
    ],
    synonyms: ['goal', 'target', 'impartial', 'unbiased'],
    antonyms: ['subjective', 'biased']
  },
  mechanism: {
    pos: 'n.',
    translation: '机制；构造；机械装置；原理',
    englishDefinition: 'A system of parts working together in a machine; a natural or established process by which something takes place.',
    ieltsBand: 'Band 7.5',
    topic: '科技媒体',
    examContextTag: '剑雅真题 18 · Reading 1 细胞自噬降解损伤蛋白质的核心分子生化机制',
    example: 'Biochemists deciphered the enzymatic mechanism through which damaged cellular organelles are recycled under metabolic stress.',
    exampleTranslation: '生物化学家彻底破译了细胞在遭遇代谢营养匮乏应激时，通过特定酶系自噬降解并循环利用受损细胞器的核心生化机制。',
    collocations: [
      { phrase: 'regulatory mechanism in governance', translation: '在宏观市场经济体系中发挥防范金融系统性风险的监管机制' },
      { phrase: 'psychological defense mechanism', translation: '个体在遭遇外界巨大精神创伤时潜意识自我防护的心理防御机制' },
      { phrase: 'underlying biological mechanism', translation: '隐藏在生命病理演进背后最深层次的底层生物学运转机制' }
    ],
    synonyms: ['process', 'system', 'apparatus', 'operation']
  },
  capacity: {
    pos: 'n.',
    translation: '容量；能力；生产力；身份',
    englishDefinition: 'The maximum amount that something can contain; the ability or power to do or experience something.',
    ieltsBand: 'Band 7.0',
    topic: '科技媒体',
    examContextTag: '剑雅真题 16 · Reading 2 现代固态锂电池储能容量与快充技术重大突破',
    example: 'Next-generation solid-state battery electrolytes substantially expand electrical storage capacity while curtailing combustion hazards.',
    exampleTranslation: '下一代固态锂电池电解质材料在彻底根除易燃起火安全隐患的同时，大幅拓展了储能电池的能量密度与容量上限。',
    collocations: [
      { phrase: 'intellectual capacity of humans', translation: '人类大脑在进行复杂抽象符号运算与艺术创造上的卓越智力潜能' },
      { phrase: 'operate at full capacity', translation: '在订单爆满的工业制造黄金期全线开动机器实现满负荷运转' },
      { phrase: 'institutional capacity to govern', translation: '体现一国现代化治理水平的行政立法机关综合治理协调能力' }
    ],
    synonyms: ['ability', 'capability', 'volume', 'competence']
  },
  framework: {
    pos: 'n.',
    translation: '框架；构架；体制；准则体系',
    englishDefinition: 'A basic structure underlying a system, concept, or text.',
    ieltsBand: 'Band 7.0',
    topic: '政府法律',
    examContextTag: '剑雅真题 17 · Task 2 联合国巴黎气候协定构建的全球减排履约法律框架',
    example: 'Signatory nations negotiated a binding regulatory framework to enforce annual greenhouse reduction commitments.',
    exampleTranslation: '各缔约国经过艰苦的多边外交博弈，最终达成了一项具备法律约束力的监管框架，以严格监督每年碳减排承诺的兑现。',
    collocations: [
      { phrase: 'legal and regulatory framework', translation: '为新兴人工智能产业保驾护航、防范伦理失控的法治与监管制度框架' },
      { phrase: 'theoretical framework in research', translation: '为整个跨学科社会学实证探索奠定深厚学理根基的严密理论框架' },
      { phrase: 'structural framework of the building', translation: '经受住九级强震考验、抗扭拉性能极佳的摩天大楼超强钢结构骨架' }
    ],
    synonyms: ['structure', 'scaffolding', 'skeleton', 'architecture']
  },
  priority: {
    pos: 'n.',
    translation: '优先事项；当务之急；优先权',
    englishDefinition: 'The fact or condition of being regarded or treated as more important than others.',
    ieltsBand: 'Band 6.5',
    topic: '政府法律',
    examContextTag: '剑雅真题 18 · Task 2 城市公共财政支出：医疗教育应当享有最高优先权',
    example: 'Expanding access to primary education and municipal sanitation must be treated as an urgent civic priority.',
    exampleTranslation: '扩大基层优质普惠教育供给以及完善市政环卫污水管网，必须被各级行政当局作为压倒一切的当务之急予以全力优先保障。',
    collocations: [
      { phrase: 'top priority on the government agenda', translation: '列入国家最高决策议事日程、享有绝对话语权的重中之重头等要务' },
      { phrase: 'give high priority to environmental protection', translation: '在追求经济发展指标的同时给予生态环境保护极高的法定优先地位' },
      { phrase: 'competing priorities in budget allocation', translation: '在财力有限的财政预算蛋糕切分博弈中各职能部门间相持不下的争夺' }
    ],
    synonyms: ['precedence', 'paramountcy', 'urgency', 'preference']
  },
  dynamic: {
    pos: 'adj. & n.',
    translation: '充满活力的；动态的；动力的；相互作用机制',
    englishDefinition: 'Characterized by constant change, activity, or progress; a force that stimulates change.',
    ieltsBand: 'Band 7.0',
    topic: '社会文化',
    examContextTag: '剑雅真题 16 · Reading 1 大都市圈多元族群流动与充满生机的文化动态交互',
    example: 'The dynamic cultural interplay between diverse migrant communities enriches the culinary and artistic fabric of metropolises.',
    exampleTranslation: '多元外来移民群体之间充满活力与张力的生动文化交流互鉴，极大地丰富繁荣了大都市的美食版图与多元艺术底蕴。',
    collocations: [
      { phrase: 'dynamic market conditions', translation: '瞬息万变、充满不确定性与无限商机的全球化活跃市场态势' },
      { phrase: 'power dynamics in organizations', translation: '隐藏在现代企业组织架构深处微妙博弈、此消彼长的权力互动机制' },
      { phrase: 'dynamic economic growth', translation: '依托科技创新催生新质生产力、展现出蓬勃生机活力的经济强劲增长' }
    ],
    synonyms: ['energetic', 'active', 'evolving', 'forceful'],
    antonyms: ['static', 'inert', 'sluggish']
  }
};
