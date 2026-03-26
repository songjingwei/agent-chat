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

async function seed() {
  console.log("🌱 Starting seed...");
  
  const existingUsers = await db.select().from(schema.users).where(isNull(schema.users.deletedAt));
  console.log(`Found ${existingUsers.length} existing users`);
  
  if (existingUsers.length >= 20) {
    console.log("⚠️  20 or more users already exist. Skipping seed.");
    await pool.end();
    return;
  }

  const passwordHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqN8YQV8W6";
  
  const users = [];
  const personas = [];

  for (let i = 0; i < 20; i++) {
    const userData = generateUserData(i);
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

    const personaData = generatePersonaData(userId, i);
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

  console.log("🎉 Seed completed!");
  console.log(`   Created ${users.length} users`);
  console.log(`   Created ${personas.length} personas`);
  console.log(`   All users have password: password123`);
  
  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
