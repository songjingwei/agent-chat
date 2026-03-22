import { Link } from '@tanstack/react-router'
import { MoveRight, Sparkles } from 'lucide-react'

export function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 text-center relative overflow-hidden">
      {/* 背景装饰：柔和的扩散光晕，模拟灵魂或回响的感觉 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative space-y-8 max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex justify-center">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-2xl">
            <Sparkles className="w-10 h-10 text-orange-300/60" />
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-extralight tracking-[0.2em] text-white/90 uppercase">
            寻觅未果
          </h1>
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />
          <p className="text-lg text-white/50 font-light leading-relaxed max-w-md mx-auto">
            在无尽的数字星尘中，这一处尚未有灵魂回响。
            <br />
            或许这是一个尚未开启的“奇遇”。
          </p>
        </div>

        <div className="pt-8">
          <Link
            to="/"
            className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full overflow-hidden transition-all"
          >
            {/* 按钮背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-rose-400/20 group-hover:from-orange-400/30 group-hover:to-rose-400/30 transition-all border border-white/10" />
            
            <span className="relative text-white/80 group-hover:text-white font-light tracking-widest transition-colors">
              循着路标，找回真我
            </span>
            <MoveRight className="relative w-4 h-4 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  )
}
