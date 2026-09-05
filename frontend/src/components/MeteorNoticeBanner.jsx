import { Sparkles, AlertTriangle } from 'lucide-react';

export default function MeteorNoticeBanner() {
  const triggerMeteor = () => {
    if (typeof window !== 'undefined' && typeof window.__triggerScreenImpact === 'function') {
      window.__triggerScreenImpact({ isManual: true });
    }
  };

  const itemText = "Nếu bạn dùng PC thì đừng spam nút B nhé! ☄️ Màn hình có thể bị đập vỡ vụn đấy 💥";

  return (
    <div
      className="w-full max-w-6xl mx-auto mt-6 md:mt-8 px-3 sm:px-4 select-none z-10"
      data-aos="fade-up"
      data-aos-delay="400"
    >
      <div className="relative overflow-hidden rounded-full border border-[#F1D89E]/30 bg-black/45 backdrop-blur-md px-3 sm:px-5 py-2 sm:py-2.5 shadow-[0_0_30px_rgba(241,216,158,0.12)] hover:border-[#F1D89E]/60 transition duration-300 flex items-center group">
        
        {/* Glow ambient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-[#F1D89E]/10 to-amber-500/10 pointer-events-none opacity-60 group-hover:opacity-100 transition" />

        {/* Badge trái cố định */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 bg-[#F1D89E]/20 border border-[#F1D89E]/40 text-[#F1D89E] text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full mr-2.5 sm:mr-4 shadow-sm z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F1D89E]" />
          </span>
          <AlertTriangle className="w-3.5 h-3.5 text-[#F1D89E] shrink-0" />
          <span className="tracking-wide uppercase whitespace-nowrap text-[10px] sm:text-[11px]">Lưu ý PC</span>
        </div>

        {/* Dòng chữ chạy Marquee vô tận */}
        <div className="overflow-hidden relative flex-1 flex items-center [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] cursor-pointer" onClick={triggerMeteor} title="Bấm phím 'B' trên bàn phím hoặc nhấp vào đây để thử!">
          <div className="animate-marquee-track flex items-center gap-6 sm:gap-8 text-xs sm:text-sm text-gray-200 font-medium">
            <span className="flex items-center gap-2">
              <span>{itemText}</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/15 text-[#F1D89E] border border-[#F1D89E]/40 rounded shadow">B</kbd>
            </span>
            <span className="text-[#F1D89E]/50 font-bold">✦</span>
            <span className="flex items-center gap-2">
              <span>{itemText}</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/15 text-[#F1D89E] border border-[#F1D89E]/40 rounded shadow">B</kbd>
            </span>
            <span className="text-[#F1D89E]/50 font-bold">✦</span>
            <span className="flex items-center gap-2">
              <span>{itemText}</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/15 text-[#F1D89E] border border-[#F1D89E]/40 rounded shadow">B</kbd>
            </span>
            <span className="text-[#F1D89E]/50 font-bold">✦</span>
            <span className="flex items-center gap-2">
              <span>{itemText}</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/15 text-[#F1D89E] border border-[#F1D89E]/40 rounded shadow">B</kbd>
            </span>
            <span className="text-[#F1D89E]/50 font-bold">✦</span>
          </div>
        </div>

        {/* Nút Phím B tương tác nhanh bên phải */}
        <button
          onClick={triggerMeteor}
          title="Bấm phím 'B' hoặc nhấn vào đây"
          className="shrink-0 hidden sm:flex items-center gap-1 ml-3 px-2.5 py-1 rounded-full bg-white/10 hover:bg-[#F1D89E] text-gray-300 hover:text-black text-xs font-semibold border border-white/15 hover:border-[#F1D89E] transition z-10 cursor-pointer shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[11px]">Thử phím B</span>
        </button>

      </div>
    </div>
  );
}
