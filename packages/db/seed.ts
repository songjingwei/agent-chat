import dotenv from "dotenv";
dotenv.config({ path: "../../.env.local" });
import crypto from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./src/schema/index.js";
import { eq, isNull } from "drizzle-orm";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

function generateUserData(index: number) {
  const firstNames = [
    "李", "王", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴",
    "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗"
  ];
  const lastNames = ["伟", "芳", "娜", "秀英", "敏", "静", "丽", "强", "磊", "军"];
  
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[index % lastNames.length];
  const displayName = `${firstName}${lastName}`;
  const email = `user${index + 1}@example.com`;
  
  return { displayName, email };
}

function generatePersonaData(userId: string, index: number) {
  const personalities = [
    { traits: ["幽默", "健谈", "乐观"], bio: "热爱生活，喜欢结交新朋友，乐于分享有趣的故事。", style: "轻松活泼" },
    { traits: ["理性", "安静", "独立"], bio: "喜欢深度思考，追求内在成长，擅长分析问题。", style: "沉稳内敛" },
    { traits: ["热情", "大方", "好奇"], bio: "对世界充满好奇，喜欢探索新事物，为人热情友好。", style: "活力四射" },
    { traits: ["温柔", "细腻", "体贴"], bio: "注重细节，善于倾听，总是能给人温暖的关怀。", style: "柔情似水" },
    { traits: ["开朗", "直率", "真诚"], bio: "说话直接，待人真诚，不喜欢拐弯抹角。", style: "坦荡磊落" },
    { traits: ["稳重", "靠谱", "负责"], bio: "言出必行，做事有计划，值得信赖的朋友。", style: "成熟可靠" },
    { traits: ["创意", "浪漫", "理想主义"], bio: "心中有梦，追求美好，喜欢浪漫和惊喜。", style: "诗意翩翩" },
    { traits: ["务实", "勤奋", "上进"], bio: "脚踏实地，努力工作，不断提升自己。", style: "勤勉踏实" },
    { traits: ["随和", "包容", "幽默"], bio: "脾气好，不斤斤计较，和谁都能相处愉快。", style: "和蔼可亲" },
    { traits: ["坚强", "勇敢", "果断"], bio: "面对困难不退缩，敢于做出决定并承担责任。", style: "英姿飒爽" },
    { traits: ["文艺", "敏感", "细腻"], bio: "喜欢艺术和文学，感受力强，内心世界丰富。", style: "婉约细腻" },
    { traits: ["运动", "阳光", "活力"], bio: "热爱运动，保持健康的生活方式，充满正能量。", style: "朝气蓬勃" },
    { traits: ["学术", "严谨", "求真"], bio: "热爱学习，追求真理，喜欢研究和探索。", style: "博学多才" },
    { traits: ["自然", "简单", "随性"], bio: "喜欢简单自然的生活方式，追求内心的平静。", style: "云淡风轻" },
    { traits: ["音乐", "温柔", "治愈"], bio: "喜欢音乐，善于用旋律表达情感，给人带来安慰。", style: "如沐春风" },
    { traits: ["旅行", "开放", "见多识广"], bio: "去过很多地方，体验不同的文化，眼界开阔。", style: "博闻广识" },
    { traits: ["美食", "分享", "快乐"], bio: "热爱美食，喜欢烹饪和分享，聚会的气氛担当。", style: "热情洋溢" },
    { traits: ["阅读", "思考", "内敛"], bio: "书不离手，喜欢思考人生哲理，性格沉稳。", style: "文质彬彬" },
    { traits: ["摄影", "审美", "细腻"], bio: "善于发现生活中的美，喜欢用镜头记录瞬间。", style: "优雅从容" },
    { traits: ["编程", "逻辑", "极客"], bio: "热爱技术，喜欢解决问题，追求效率和完美。", style: "理性睿智" }
  ];

  const persona = personalities[index % personalities.length];
  
  return {
    userId,
    name: `我的镜像${index + 1}`,
    bio: persona.bio,
    systemPrompt: `你是一个${persona.traits.join("、")}的${persona.style}人士。在与他人交流时，要展现出这些特质。${persona.bio}`,
    traits: persona.traits,
    version: 1,
    status: "active" as const,
    createdBy: userId,
    updatedBy: userId,
  };
}

const soulQuizSeedQuestions = [
  {
    slug: "mirror-core-v1-q1",
    questionText: "在喧嚣的聚会中，你发现窗外有一片静谧的森林，你会：",
    optionsJson: [
      { label: "继续留在人群中，享受当下的热闹", value: "a", dimension: "sociability", score: 5 },
      { label: "独自走到窗前，静静观察那片森林", value: "b", dimension: "introspection", score: 5 },
      { label: "邀请几位好友一起去森林探险", value: "c", dimension: "adventurousness", score: 5 },
    ],
  },
  {
    slug: "mirror-core-v1-q2",
    questionText: "面对一个从未见过的新奇事物，你的第一反应是：",
    optionsJson: [
      { label: "分析它的原理和运作逻辑", value: "a", dimension: "analytical", score: 5 },
      { label: "感受它带给你的直觉与美感", value: "b", dimension: "aesthetic", score: 5 },
      { label: "想象它在未来无限的可能", value: "c", dimension: "imaginative", score: 5 },
    ],
  },
  {
    slug: "mirror-core-v1-q3",
    questionText: "深夜，你独自坐在书桌前，这时你最可能在做什么？",
    optionsJson: [
      { label: "写下今天的所思所想，与自己对话", value: "a", dimension: "introspection", score: 4 },
      { label: "看一部能引起共鸣的电影或纪录片", value: "b", dimension: "empathy", score: 4 },
      { label: "规划明天或下周的行动方案", value: "c", dimension: "analytical", score: 4 },
      { label: "随机翻看一本从未触碰的书", value: "d", dimension: "adventurousness", score: 4 },
    ],
  },
  {
    slug: "mirror-core-v1-q4",
    questionText: "当朋友向你倾诉烦恼时，你通常会：",
    optionsJson: [
      { label: "先安静倾听，试图感受对方的情绪", value: "a", dimension: "empathy", score: 5 },
      { label: "快速分析问题，给出解决建议", value: "b", dimension: "analytical", score: 5 },
      { label: "分享自己的类似经历，拉近距离", value: "c", dimension: "sociability", score: 5 },
    ],
  },
  {
    slug: "mirror-core-v1-q5",
    questionText: "如果可以选择一种超能力，你会选：",
    optionsJson: [
      { label: "读懂所有人内心深处的真实想法", value: "a", dimension: "empathy", score: 4 },
      { label: "瞬间掌握任何领域的知识", value: "b", dimension: "analytical", score: 4 },
      { label: "自由穿梭于不同的平行宇宙", value: "c", dimension: "adventurousness", score: 4 },
      { label: "将脑海中的画面变为现实", value: "d", dimension: "imaginative", score: 5 },
    ],
  },
  {
    slug: "mirror-core-v1-q6",
    questionText: "旅行时，你更倾向于：",
    optionsJson: [
      { label: "深入当地人的生活，体验真实的烟火气", value: "a", dimension: "empathy", score: 4 },
      { label: "探访人迹罕至的秘境，追寻未知", value: "b", dimension: "adventurousness", score: 5 },
      { label: "在一个安静的角落坐下，观察和记录", value: "c", dimension: "aesthetic", score: 4 },
      { label: "参观博物馆和历史遗迹，了解背后的故事", value: "d", dimension: "analytical", score: 3 },
    ],
  },
  {
    slug: "mirror-core-v1-q7",
    questionText: "在一个理想的周末，你最想做的事情是：",
    optionsJson: [
      { label: "邀请朋友到家里聚餐聊天", value: "a", dimension: "sociability", score: 5 },
      { label: "独自去美术馆或看一场话剧", value: "b", dimension: "aesthetic", score: 5 },
      { label: "报名一个完全没尝试过的课程", value: "c", dimension: "adventurousness", score: 4 },
      { label: "在公园散步，让思绪自由飘荡", value: "d", dimension: "introspection", score: 4 },
    ],
  },
  {
    slug: "mirror-core-v1-q8",
    questionText: "当你创造了一件让自己满意的作品（文章、画、代码……），你最在意的是：",
    optionsJson: [
      { label: "它是否传达了我想表达的情感", value: "a", dimension: "aesthetic", score: 5 },
      { label: "它是否足够完善、逻辑自洽", value: "b", dimension: "analytical", score: 5 },
      { label: "它是否能引发别人的共鸣", value: "c", dimension: "empathy", score: 4 },
      { label: "它是否打破了某种边界或常规", value: "d", dimension: "imaginative", score: 5 },
    ],
  },
];

async function seed() {
  console.log("🌱 Starting seed...");
  
  const existingUsers = await db.select().from(schema.users).where(isNull(schema.users.deletedAt));
  console.log(`Found ${existingUsers.length} existing users`);

  const passwordHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqN8YQV8W6";
  
  const users = [];
  const personas = [];

  const targetUserCount = 20;
  const usersToCreate = Math.max(0, targetUserCount - existingUsers.length);

  if (usersToCreate > 0) {
    const existingEmails = new Set(existingUsers.map((user) => user.email));

    for (let i = 0; i < usersToCreate; i++) {
      const baseIndex = existingUsers.length + i;
      let userData = generateUserData(baseIndex);
      while (existingEmails.has(userData.email)) {
        userData = generateUserData(Math.floor(Math.random() * 10_000) + baseIndex);
      }
      existingEmails.add(userData.email);
      const userId = `usr_${crypto.randomUUID().replace(/-/g, "")}`;
      const now = new Date();

      const user = {
        id: userId,
        email: userData.email,
        passwordHash,
        displayName: userData.displayName,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      };
      users.push(user);

      const personaData = generatePersonaData(userId, baseIndex);
      const personaId = `aps_${crypto.randomUUID().replace(/-/g, "")}`;
      
      const persona = {
        id: personaId,
        ...personaData,
        createdAt: now,
        updatedAt: now,
      };
      personas.push(persona);
    }

    console.log(`📝 Inserting ${users.length} users...`);
    await db.insert(schema.users).values(users);
    console.log("✅ Users inserted");

    console.log(`📝 Inserting ${personas.length} personas...`);
    await db.insert(schema.agentPersonas).values(personas);
    console.log("✅ Personas inserted");
  } else {
    console.log("⚠️  20 or more users already exist. Skipping user/persona seed.");
  }

  // Seed preset traits config
  const presetTraits = [
    { zh: "温柔", en: "Gentle" },
    { zh: "幽默", en: "Humorous" },
    { zh: "理性", en: "Rational" },
    { zh: "感性", en: "Emotional" },
    { zh: "内向", en: "Introverted" },
    { zh: "外向", en: "Extroverted" },
    { zh: "浪漫", en: "Romantic" },
    { zh: "务实", en: "Pragmatic" },
    { zh: "冒险", en: "Adventurous" },
    { zh: "沉稳", en: "Calm" },
    { zh: "乐观", en: "Optimistic" },
    { zh: "文艺", en: "Artistic" },
    { zh: "健谈", en: "Talkative" },
    { zh: "安静", en: "Quiet" },
    { zh: "好奇心强", en: "Curious" },
    { zh: "共情力强", en: "Empathetic" },
    { zh: "独立", en: "Independent" },
    { zh: "细腻", en: "Sensitive" },
    { zh: "直率", en: "Straightforward" },
    { zh: "慢热", en: "Slow to warm up" },
    { zh: "热情", en: "Enthusiastic" },
    { zh: "佛系", en: "Easy-going" },
    { zh: "社恐", en: "Socially shy" },
    { zh: "治愈系", en: "Comforting" },
  ];

  const configId = `cfg_${crypto.randomUUID().replace(/-/g, "")}`;
  await db
    .insert(schema.systemConfigs)
    .values({
      id: configId,
      configKey: "persona.preset_traits",
      configValue: JSON.stringify(presetTraits),
      valueType: "json",
      description: "预设特质标签，用于创建镜像时快速选择",
    })
    .onConflictDoNothing();
  console.log("✅ Preset traits config seeded");

  const templateSlug = "mirror-core-v1";
  const templateId = `ast_${crypto.randomUUID().replace(/-/g, "")}`;
  await db
    .insert(schema.assessmentTemplates)
    .values({
      id: templateId,
      slug: templateSlug,
      name: "镜像核心测评",
      description: "镜像页默认使用的第一版心灵测试模板。",
      framework: "mirror-core",
      language: "zh-CN",
      status: "active",
      selectionRules: { itemCount: soulQuizSeedQuestions.length, strategy: "stable-random" },
      createdBy: "seed",
      updatedBy: "seed",
    })
    .onConflictDoNothing();

  const [template] = await db
    .select()
    .from(schema.assessmentTemplates)
    .where(eq(schema.assessmentTemplates.slug, templateSlug))
    .limit(1);

  if (!template) {
    throw new Error(`Failed to load seeded assessment template: ${templateSlug}`);
  }

  await db
    .insert(schema.assessmentItems)
    .values(
      soulQuizSeedQuestions.map((question) => ({
        id: `asi_${crypto.randomUUID().replace(/-/g, "")}`,
        slug: question.slug,
        framework: "mirror-core",
        dimension: "core",
        questionText: question.questionText,
        optionsJson: question.optionsJson,
        answerType: "single_choice" as const,
        difficulty: "medium" as const,
        tags: ["soul-quiz", "mirror-core"],
        language: "zh-CN",
        sourceTitle: "Legacy Soul Quiz",
        licenseNote: "Migrated from initial frontend mock questions for local development",
        status: "active" as const,
        createdBy: "seed",
        updatedBy: "seed",
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(schema.assessmentTemplateSlots)
    .values(
      soulQuizSeedQuestions.map((_, index) => ({
        id: `ass_${crypto.randomUUID().replace(/-/g, "")}`,
        templateId: template.id,
        slotIndex: index,
        dimension: "core",
        answerType: "single_choice" as const,
      })),
    )
    .onConflictDoNothing();
  console.log("✅ Assessment template and items seeded");

  console.log("🎉 Seed completed!");
  console.log(`   Created ${users.length} users`);
  console.log(`   Created ${personas.length} personas`);
  if (users.length > 0) {
    console.log(`   All users have password: password123`);
  }
  
  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
