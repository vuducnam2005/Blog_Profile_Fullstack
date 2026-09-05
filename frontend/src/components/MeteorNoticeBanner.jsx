export default function MeteorNoticeBanner() {
  const triggerMeteor = () => {
    if (typeof window !== 'undefined' && typeof window.__triggerScreenImpact === 'function') {
      window.__triggerScreenImpact({ isManual: true });
    }
  };

  const itemText = "Nếu bạn dùng PC thì đừng spam nút B nhé! ☄️ Màn hình có thể bị đập vỡ vụn đấy 💥";

  return (
    <div
      className="hidden md:flex items-center flex-1 min-w-0 mx-3 lg:mx-5 xl:mx-8 max-w-[340px] lg:max-w-[460px] xl:max-w-[580px] h-7 lg:h-8 rounded-full border border-[#F1D89E]/25 bg-black/45 backdrop-blur-md px-2 lg:px-2.5 overflow-hidden shadow-sm hover:border-[#F1D89E]/50 transition select-none cursor-pointer group"
      onClick={triggerMeteor}
      title="Nhấp vào đây hoặc ấn phím 'B' trên bàn phím để thử!"
    >
      {/* Badge cảnh báo mini */}
      <div className="shrink-0 flex items-center gap-1 bg-[#F1D89E]/20 border border-[#F1D89E]/40 text-[#F1D89E] text-[10px] font-bold px-2 py-0.5 rounded-full mr-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#F1D89E]" />
        </span>
        <span className="tracking-wider uppercase whitespace-nowrap text-[9px] lg:text-[10px]">Lưu ý PC</span>
      </div>

      {/* Dòng chữ chạy Marquee */}
      <div className="overflow-hidden relative flex-1 flex items-center [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div className="animate-marquee-track flex items-center gap-6 text-[11px] lg:text-xs text-gray-300 font-medium whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <span>{itemText}</span>
            <kbd className="px-1 py-0.2 text-[9px] font-mono bg-white/10 text-[#F1D89E] border border-[#F1D89E]/30 rounded">B</kbd>
          </span>
          <span className="text-[#F1D89E]/40 font-bold">✦</span>
          <span className="flex items-center gap-1.5">
            <span>{itemText}</span>
            <kbd className="px-1 py-0.2 text-[9px] font-mono bg-white/10 text-[#F1D89E] border border-[#F1D89E]/30 rounded">B</kbd>
          </span>
          <span className="text-[#F1D89E]/40 font-bold">✦</span>
          <span className="flex items-center gap-1.5">
            <span>{itemText}</span>
            <kbd className="px-1 py-0.2 text-[9px] font-mono bg-white/10 text-[#F1D89E] border border-[#F1D89E]/30 rounded">B</kbd>
          </span>
          <span className="text-[#F1D89E]/40 font-bold">✦</span>
          <span className="flex items-center gap-1.5">
            <span>{itemText}</span>
            <kbd className="px-1 py-0.2 text-[9px] font-mono bg-white/10 text-[#F1D89E] border border-[#F1D89E]/30 rounded">B</kbd>
          </span>
          <span className="text-[#F1D89E]/40 font-bold">✦</span>
        </div>
      </div>
    </div>
  );
}

