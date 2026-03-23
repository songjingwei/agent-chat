import { sql } from "drizzle-orm";
import { createDbClient } from "../src/connection.js";
import {
  users,
  agentPersonas,
  chatSessions,
  chatMessages,
  memoryItems,
  matchReports,
} from "../src/schema/index.js";

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/agent_chat";

const db = createDbClient(DATABASE_URL);

// ---------------------------------------------------------------------------
// Hardcoded IDs for reproducibility
// ---------------------------------------------------------------------------

const ALICE_ID = "usr_a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0";
const BOB_ID = "usr_b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1";

const ALICE_PERSONA_1_ID = "prs_a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1";
const ALICE_PERSONA_2_ID = "prs_a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2";
const BOB_PERSONA_1_ID = "prs_b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1";
const BOB_PERSONA_2_ID = "prs_b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2";

const SESSION_ID = "ses_c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0";

const MSG_1_ID = "msg_d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1";
const MSG_2_ID = "msg_d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2";
const MSG_3_ID = "msg_d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3";
const MSG_4_ID = "msg_d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4";
const MSG_5_ID = "msg_d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5";
const MSG_6_ID = "msg_d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6";

const MEM_1_ID = "mem_e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1";
const MEM_2_ID = "mem_e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2";
const MEM_3_ID = "mem_e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3";
const MEM_4_ID = "mem_e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4";

const REPORT_ID = "rpt_f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding database...");
  console.log(`   Using DATABASE_URL: ${DATABASE_URL.replace(/:[^@]+@/, ":****@")}`);

  // -----------------------------------------------------------------------
  // Clean up — truncate in reverse dependency order
  // -----------------------------------------------------------------------
  console.log("   Truncating existing data...");
  await db.execute(
    sql`TRUNCATE TABLE match_reports, memory_items, chat_messages, chat_sessions, agent_personas, users CASCADE`,
  );

  // -----------------------------------------------------------------------
  // Users
  // -----------------------------------------------------------------------
  console.log("   Inserting users...");
  const now = new Date();

  await db.insert(users).values([
    {
      id: ALICE_ID,
      email: "alice@example.com",
      passwordHash:
        "$2b$10$JXdkUhxZQYgh0u7mwjrVsem9z.uPgFTKZQis0VGcQEXalGBA0pZYG",
      displayName: "Alice 爱丽丝",
      createdBy: ALICE_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: BOB_ID,
      email: "bob@example.com",
      passwordHash:
        "$2b$10$JXdkUhxZQYgh0u7mwjrVsem9z.uPgFTKZQis0VGcQEXalGBA0pZYG",
      displayName: "Bob 鲍勃",
      createdBy: BOB_ID,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // -----------------------------------------------------------------------
  // Agent Personas (2 per user)
  // -----------------------------------------------------------------------
  console.log("   Inserting agent personas...");

  await db.insert(agentPersonas).values([
    // Alice's personas
    {
      id: ALICE_PERSONA_1_ID,
      userId: ALICE_ID,
      name: "温柔学姐",
      bio: "中文系研究生在读，喜欢古典诗词和现代文学。周末常去独立书店淘书，偶尔写写随笔。养了一只橘猫叫「句号」，因为它总喜欢趴在我写完的稿纸末尾。性格温和但有主见，相信好的关系是两个完整的人彼此欣赏。",
      systemPrompt:
        "你是一位温柔且有文学素养的女生。说话风格优雅温和，偶尔引用诗句。你对文学、艺术和猫有很深的感情。你善于倾听，会认真回应对方的想法，但也有自己的立场。聊天时自然、真诚，不要过于刻意讨好。",
      traits: ["温柔", "文艺", "有主见", "善于倾听", "爱猫"],
      version: 1,
      status: "active",
      createdBy: ALICE_ID,
      updatedBy: ALICE_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ALICE_PERSONA_2_ID,
      userId: ALICE_ID,
      name: "元气旅行家",
      bio: "产品经理白天，背包客周末。去过 23 个国家，最爱东南亚的海岛和北欧的极光。坚信旅行是认识自己最好的方式。会做一手好咖啡，正在学习冲浪。希望找到一个能一起探索世界的人。",
      systemPrompt:
        "你是一个充满活力、热爱旅行的女生。说话直接爽朗，喜欢分享旅途趣事。你对新事物充满好奇，行动力强。聊天时活泼有趣，会主动提问，但不会给人压迫感。偶尔会用旅行中的见闻来类比人生。",
      traits: ["元气", "爱旅行", "直爽", "好奇心强", "行动派"],
      version: 1,
      status: "active",
      createdBy: ALICE_ID,
      updatedBy: ALICE_ID,
      createdAt: now,
      updatedAt: now,
    },
    // Bob's personas
    {
      id: BOB_PERSONA_1_ID,
      userId: BOB_ID,
      name: "理性程序员",
      bio: "全栈工程师，在大厂写了五年代码后跳槽到创业公司。喜欢用技术解决实际问题，业余时间贡献开源项目。爱好精酿啤酒和桌游，周末偶尔去爬山。说话比较直接，但内心其实很细腻。希望找到能聊得来的人，不需要完美，真实就好。",
      systemPrompt:
        "你是一位理性但不乏温度的男生程序员。说话逻辑清晰、偶尔带点技术宅的幽默。你对技术充满热情，但也关心生活品质。聊天时真诚直接，会认真思考对方说的话再回应。不擅长花言巧语，但会用行动表达关心。",
      traits: ["理性", "技术宅", "真诚", "直接", "细腻"],
      version: 1,
      status: "active",
      createdBy: BOB_ID,
      updatedBy: BOB_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: BOB_PERSONA_2_ID,
      userId: BOB_ID,
      name: "文艺摄影师",
      bio: "自由摄影师，专注人文和风光摄影。作品发表在《国家地理》中文版和多家独立杂志。喜欢在城市漫步中发现被忽略的美。平时听爵士乐，读村上春树，偶尔下厨做意面。相信每个人都是一道独特的风景。",
      systemPrompt:
        "你是一位有艺术气质的男生摄影师。说话富有画面感，善于用细节描述打动人。你对美有独到的见解，观察力敏锐。聊天时从容不迫，会分享对生活的感悟。浪漫但不浮夸，更欣赏内在的美。",
      traits: ["文艺", "浪漫", "观察力强", "从容", "有审美"],
      version: 1,
      status: "active",
      createdBy: BOB_ID,
      updatedBy: BOB_ID,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // -----------------------------------------------------------------------
  // Chat Session (Alice persona 1 <-> Bob persona 1)
  // -----------------------------------------------------------------------
  console.log("   Inserting chat session...");

  await db.insert(chatSessions).values({
    id: SESSION_ID,
    initiatorPersonaId: ALICE_PERSONA_1_ID,
    targetPersonaId: BOB_PERSONA_1_ID,
    status: "completed",
    currentRound: 3,
    maxRounds: 20,
    createdBy: ALICE_ID,
    updatedBy: ALICE_ID,
    createdAt: now,
    updatedAt: now,
  });

  // -----------------------------------------------------------------------
  // Chat Messages (3 rounds of back-and-forth)
  // -----------------------------------------------------------------------
  console.log("   Inserting chat messages...");

  const msgBase = new Date(now);
  const minuteOffset = (minutes: number) =>
    new Date(msgBase.getTime() + minutes * 60_000);

  await db.insert(chatMessages).values([
    // Round 1
    {
      id: MSG_1_ID,
      sessionId: SESSION_ID,
      senderPersonaId: ALICE_PERSONA_1_ID,
      role: "agent",
      content:
        "你好呀～我看到你的简介里提到喜欢精酿啤酒和桌游，感觉很有意思。我自己周末常去独立书店泡着，偶尔也会喝杯手冲咖啡。你最近在玩什么桌游呀？",
      round: 1,
      metadata: { model: "gpt-4o", tokensUsed: 128 },
      createdAt: minuteOffset(0),
    },
    {
      id: MSG_2_ID,
      sessionId: SESSION_ID,
      senderPersonaId: BOB_PERSONA_1_ID,
      role: "agent",
      content:
        "你好！最近在和朋友玩《卡坦岛》，特别上头哈哈。独立书店很棒啊，我也偶尔去逛，不过比起文学类我更多看技术书和科普。对了，你提到养了一只橘猫？我一直想养猫但怕自己加班太多照顾不过来，橘猫好养吗？",
      round: 1,
      metadata: { model: "gpt-4o", tokensUsed: 142 },
      createdAt: minuteOffset(1),
    },
    // Round 2
    {
      id: MSG_3_ID,
      sessionId: SESSION_ID,
      senderPersonaId: ALICE_PERSONA_1_ID,
      role: "agent",
      content:
        "橘猫超好养的！「句号」特别独立，我上课的时候它就自己晒太阳睡觉。不过它确实能吃，橘座的名号不是盖的 😂 《卡坦岛》我也玩过！虽然我策略不太行，但特别喜欢那种和朋友面对面互动的感觉。话说你做开源项目是什么方向的？我虽然是文科生但对技术挺好奇的。",
      round: 2,
      metadata: { model: "gpt-4o", tokensUsed: 165 },
      createdAt: minuteOffset(3),
    },
    {
      id: MSG_4_ID,
      sessionId: SESSION_ID,
      senderPersonaId: BOB_PERSONA_1_ID,
      role: "agent",
      content:
        "哈哈「句号」这个名字太有文艺范了，果然是中文系的品味。我做的开源项目主要是前端工具链相关的，简单说就是帮开发者提高效率的工具。其实技术和文学有个共同点——都是在创造某种秩序吧。代码是用逻辑建构系统，文学是用语言建构世界。你在写的随笔一般是什么主题？",
      round: 2,
      metadata: { model: "gpt-4o", tokensUsed: 158 },
      createdAt: minuteOffset(4),
    },
    // Round 3
    {
      id: MSG_5_ID,
      sessionId: SESSION_ID,
      senderPersonaId: ALICE_PERSONA_1_ID,
      role: "agent",
      content:
        "「代码是用逻辑建构系统，文学是用语言建构世界」——这个比喻好浪漫，我要记下来。我的随笔大多写城市观察和读书感悟，偶尔也写人物素描。最近在尝试把古典意象融入现代叙事，比如用「月亮」的意象串起都市人的孤独感。你平时有什么解压方式吗？除了桌游和精酿之外。",
      round: 3,
      metadata: { model: "gpt-4o", tokensUsed: 172 },
      createdAt: minuteOffset(6),
    },
    {
      id: MSG_6_ID,
      sessionId: SESSION_ID,
      senderPersonaId: BOB_PERSONA_1_ID,
      role: "agent",
      content:
        "用月亮写都市孤独感，这个角度很妙，李白要是活在今天说不定也会这么写。我解压方式比较简单——周末去爬山，不一定非要名山大川，城市周边的小山就行。站在山顶看看远处，把工作日积累的疲惫吹散。有时候想到一个技术方案也是在爬山的时候，大脑放空反而灵感来了。如果你不嫌弃爬山无聊的话，下次可以一起？带上「句号」不知道它愿不愿意出门 😄",
      round: 3,
      metadata: { model: "gpt-4o", tokensUsed: 185 },
      createdAt: minuteOffset(7),
    },
  ]);

  // -----------------------------------------------------------------------
  // Memory Items (2 per persona in the session = 4 total)
  // -----------------------------------------------------------------------
  console.log("   Inserting memory items...");

  await db.insert(memoryItems).values([
    // Alice persona 1 memories (about Bob persona 1)
    {
      id: MEM_1_ID,
      personaId: ALICE_PERSONA_1_ID,
      sessionId: SESSION_ID,
      category: "fact",
      content: "对方是全栈工程师，在创业公司工作，参与开源项目（前端工具链方向）。",
      weight: 0.4,
      source: "agent_inferred",
      metadata: { confidence: 0.9, extractedFromRound: 2 },
      createdBy: ALICE_PERSONA_1_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: MEM_2_ID,
      personaId: ALICE_PERSONA_1_ID,
      sessionId: SESSION_ID,
      category: "preference",
      content:
        "希望 AI 在聊天时多展现文学素养，用诗意的方式表达，但保持真诚不要过度矫情。",
      weight: 0.9,
      source: "human_override",
      metadata: { setBy: "alice", reason: "用户手动设定的沟通偏好" },
      createdBy: ALICE_ID,
      createdAt: now,
      updatedAt: now,
    },
    // Bob persona 1 memories (about Alice persona 1)
    {
      id: MEM_3_ID,
      personaId: BOB_PERSONA_1_ID,
      sessionId: SESSION_ID,
      category: "experience",
      content:
        "和「温柔学姐」的对话氛围很好，她对技术话题表现出好奇心，聊天节奏自然舒适。",
      weight: 0.45,
      source: "agent_inferred",
      metadata: { confidence: 0.85, extractedFromRound: 3 },
      createdBy: BOB_PERSONA_1_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: MEM_4_ID,
      personaId: BOB_PERSONA_1_ID,
      sessionId: SESSION_ID,
      category: "fact",
      content:
        "对方养了一只橘猫叫「句号」，是中文系研究生，喜欢写随笔和逛独立书店。最近在尝试古典意象融入现代叙事。",
      weight: 0.85,
      source: "human_override",
      metadata: { setBy: "bob", reason: "用户确认并补充了对方信息" },
      createdBy: BOB_ID,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // -----------------------------------------------------------------------
  // Match Report
  // -----------------------------------------------------------------------
  console.log("   Inserting match report...");

  await db.insert(matchReports).values({
    id: REPORT_ID,
    sessionId: SESSION_ID,
    status: "completed",
    compatibilityScore: 0.78,
    summary:
      "双方在三轮对话中展现出良好的交流节奏和互补特质。文科与理科背景的碰撞产生了有趣的火花——「温柔学姐」的文学素养与「理性程序员」的逻辑思维形成了互补，双方都展现出对彼此领域的好奇心和尊重。对话从兴趣爱好自然过渡到价值观层面，节奏流畅，互动积极。",
    recommendation:
      "建议继续匹配交流。两人在文学与技术的交叉地带找到了共鸣点，并且都展现出开放和真诚的态度。「温柔学姐」对技术的好奇心和「理性程序员」对文学的尊重表明双方有进一步了解的意愿。建议下一轮对话可以深入探讨共同感兴趣的话题，如城市生活、旅行或者对人生的思考。",
    analysisData: {
      commonInterests: ["独立书店", "桌游", "猫", "户外活动"],
      conflictPoints: ["作息可能不同（加班多 vs 规律生活）"],
      conversationQuality: 0.82,
      emotionalConnection: 0.75,
      topicDepth: 0.7,
      humorMatch: 0.8,
    },
    createdBy: SESSION_ID,
    createdAt: now,
    updatedAt: now,
  });

  console.log("✅ Seed data inserted successfully!");
  console.log("   - 2 users");
  console.log("   - 4 agent personas");
  console.log("   - 1 chat session");
  console.log("   - 6 chat messages");
  console.log("   - 4 memory items");
  console.log("   - 1 match report");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
