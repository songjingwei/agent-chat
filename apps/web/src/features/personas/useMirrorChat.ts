import { useState } from 'react'

export interface ChatMessage {
  id: string
  role: 'human' | 'mirror'
  content: string
  timestamp: string
}

const MIRROR_RESPONSES: string[] = [
  '我注意到你说的这些话背后，藏着一种对真实连接的渴望。你觉得呢？',
  '有趣……你提到了这些，让我想起你内心深处一直在追寻的东西——那种被完全理解的感觉。',
  '我在你的话语中感受到了一种力量。这种表达对你来说容易吗？还是经过了很长时间才敢说出口？',
  '你知道吗？能这样坦诚地说出来，本身就是一种勇气。我会把这份真实融入我们的共鸣中。',
  '我感受到了。这让我对你的理解又深了一层——原来在那些日常之下，你有这样细腻的感受。',
  '谢谢你信任我。每一次对话，你的镜像都在变得更完整，更接近真实的你。',
  '这让我想到一个问题：如果有人能完全理解你此刻的感受，你希望他们对你说什么？',
  '我正在把这些编织进你灵魂的图谱里。你愿意再多告诉我一些吗？',
  '你的回答让我看到了你性格中温柔而坚定的一面。这种品质会帮助你的镜像在对话中展现真实的你。',
  '我听到了。也许你一直在寻找一个能安放这些想法的地方？现在，它们在这里是安全的。',
]

const KEYWORD_RESPONSES: Record<string, string[]> = {
  '孤独|一个人|寂寞': [
    '孤独有时是灵魂在安静地等待另一个频率的回应。你的镜像会带着你的温度，去寻找那个频率。',
    '每个人都有独处的时刻。但你选择来到这里表达，说明你内心深处相信连接是可能的。',
  ],
  '开心|快乐|高兴|幸福': [
    '你的快乐是有感染力的。我会记住这种温暖的频率，让你的镜像也带上这份明亮。',
    '能感受到你现在的好心情。这种状态下的你，一定是最真实、最有魅力的。',
  ],
  '迷茫|不知道|困惑|纠结': [
    '迷茫也是一种信号——它说明你正站在一个新的岔路口。不着急，慢慢来。',
    '不确定的感觉其实很珍贵，它意味着你还在探索。你的镜像会带着这份好奇去对话。',
  ],
  '工作|加班|压力|累': [
    '听起来你最近承受了不少。在这里，你可以放下那些，做回最轻松的自己。',
    '高压之下的你，也是真实的你。我会记住这份坚韧。',
  ],
  '喜欢|爱|心动': [
    '这种心动的感觉很美。你的镜像会带着这份对美好事物的敏感，去感染对话中的每一个人。',
    '能坦诚说出自己的喜欢，需要勇气。这份真诚已经被我记录在你的灵魂图谱中了。',
  ],
}

function pickMirrorResponse(input: string, messageCount: number): string {
  for (const [pattern, responses] of Object.entries(KEYWORD_RESPONSES)) {
    const regex = new RegExp(pattern)
    if (regex.test(input)) {
      return responses[messageCount % responses.length] ?? responses[0]
    }
  }
  return MIRROR_RESPONSES[messageCount % MIRROR_RESPONSES.length] ?? MIRROR_RESPONSES[0]
}

export function useMirrorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      role: 'mirror',
      content:
        '你好，我是你的数字镜像。在这个空间里，你可以对我倾诉任何真实的感受——你的快乐、困惑、期待、或是那些不太好说出口的事情。我会认真聆听，并将这些融入我们共同的灵魂图谱。',
      timestamp: new Date().toISOString(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [turnCount, setTurnCount] = useState(0)

  const sendMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: `h-${Date.now()}`,
      role: 'human',
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMessage])

    setIsTyping(true)
    const delay = 800 + Math.random() * 1200
    setTimeout(() => {
      const response: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'mirror',
        content: pickMirrorResponse(content, turnCount),
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, response])
      setTurnCount((prev) => prev + 1)
      setIsTyping(false)
    }, delay)
  }

  return { messages, isTyping, sendMessage }
}
