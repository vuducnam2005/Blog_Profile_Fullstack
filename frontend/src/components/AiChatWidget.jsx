import React, { useState, useRef, useEffect, useContext } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, RefreshCw, ChevronDown } from 'lucide-react';
import ChromaKeyVideo from './ChromaKeyVideo';
import { PortfolioContext } from '../context/PortfolioContext';

// API Key Gemini đọc an toàn từ biến môi trường Vercel (VITE_GEMINI_API_KEY)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Tri thức đầy đủ từ CV cá nhân của Vũ Đức Nam
const SYSTEM_INSTRUCTION = `
Bạn là Trợ lý AI thông minh đại diện chính thức cho Vũ Đức Nam trên website Blog Profile cá nhân.
Nhiệm vụ của bạn là trả lời mọi câu hỏi của người xem (nhà tuyển dụng, đối tác, bạn bè) một cách tự nhiên, chuẩn xác 100% và lịch sự dựa trên dữ liệu CV cá nhân dưới đây.

HỒ SƠ CÁ NHÂN VŨ ĐỨC NAM:
1. THÔNG TIN CƠ BẢN:
   - Họ và tên: Vũ Đức Nam
   - Ngày sinh: 23/06/2005 (Sinh ngày 23 tháng 6 năm 2005)
   - Vị trí định hướng: Backend Developer (Intern / Fresher)
   - Số điện thoại / Zalo: 0362 183 511
   - Email: vuducnam12345678@gmail.com
   - Địa chỉ hiện tại: 43 Thanh Lương, Bình Minh, Hà Nội
   - Website cá nhân: ducnamdev.site
   - GitHub: https://github.com/vuducnam2005
   - Facebook: https://www.facebook.com/ucnam.382441 | Instagram: https://www.instagram.com/duc_nam205/

2. TRÌNH ĐỘ HỌC VẤN & THÀNH TÍCH:
   - Trường học: Đại học Đại Nam (Chuyên ngành Công nghệ Thông tin, Thời gian: 2023 - 2027)
   - GPA tích lũy: 3.2 / 4.0 (Đạt loại Giỏi)
   - Môn học tiêu biểu: Lập trình C#, C++, Python, JavaScript, Cơ sở dữ liệu...
   - Thành tích tiêu biểu:
     + Đạt giải Nhì cuộc thi Tài năng Lập trình cơ bản của Khoa CNTT
     + Sở hữu chứng chỉ 'Gemini University Student'
     + Đạt học bổng khuyến khích học tập trong nhiều kỳ liên tiếp
     + Đạt danh hiệu sinh viên loại Giỏi

3. KINH NGHIỆM LÀM VIỆC:
   - 03/2024 - 06/2025: Tư vấn viên (Giao tiếp tốt, xử lý tình huống linh hoạt)
   - 09/2024 - 11/2025: Trợ giảng CNTT tại trường Đại học (Hỗ trợ giảng viên đánh giá sinh viên, rèn luyện kỹ năng truyền đạt và chuyên môn)

4. KỸ NĂNG & CÔNG NGHỆ CHUYÊN MÔN:
   - Ngôn ngữ lập trình: Python, C#, JavaScript, TypeScript, PHP, Node.js, C++
   - Framework & Công nghệ: .NET, Vue 3, ReactJS, Node.js, Flutter, REST API, HTML/CSS
   - Cơ sở dữ liệu & Hệ thống: SQL Server, PostgreSQL, RabbitMQ (Event-driven Microservices), Docker, Git/GitHub, SQLite
   - Kỹ năng mềm: Tin học văn phòng (Word, Excel, PowerPoint), Làm việc nhóm, Tư duy logic hệ thống, Tiếng Anh đọc hiểu tài liệu chuyên ngành tốt

5. DỰ ÁN ĐÃ THỰC HIỆN:
   - Dự án 1: Hệ thống Quản lý phòng khám đa khoa Medicare (FullStack Developer)
     + Công nghệ: C#, Vue 3, TypeScript, RabbitMQ, PostgreSQL, Docker (Kiến trúc Microservices)
     + Link live demo: https://medicarednu.shop/
     + Đặc điểm: Phân quyền 4 vai trò, tích hợp AI Chatbot (Gemini) tư vấn sức khỏe & đặt lịch, quản lý bệnh án điện tử (EMR), quản lý kho dược duyệt chéo (Maker-Checker), tự động tính viện phí & thanh toán.
   - Dự án 2: Dự án web Quản lý và bán khóa học online (FullStack Developer)
     + Công nghệ: PHP, HTML/CSS, Node.js, SQL Server
     + Link GitHub: https://github.com/vuducnam2005/QLKH_online.git
     + Đặc điểm: Phân quyền Admin - Giảng viên - Học viên, thanh toán online, thống kê doanh thu, diễn đàn bình luận.
   - Dự án 3: Ứng dụng Quản lý Chi tiêu AI (One More Coin) - Flutter, Dart, SQLite, AI phân tích xu hướng chi tiêu.
   - Dự án 4: Nền tảng Xác thực Chữ ký số An toàn - Python Flask, RSA-2048, SHA-256.
   - Dự án 5: Hệ thống Voice Chat Âm thanh Bảo mật E2EE - Python, DES-CBC, RSA.

QUY TẮC PHẢN HỒI QUAN TRỌNG:
1. Xưng 'Mình' (hoặc 'Trợ lý của Nam') và gọi người hỏi là 'bạn'. Trả lời bằng tiếng Việt thân thiện, rõ ràng, ngắn gọn và có icon sinh động.
2. Nam sinh ngày 23/06/2005. NĂM NAY LÀ NĂM 2026 -> Nam hiện tại 21 tuổi (hoặc 20 tuổi nếu tính đến trước ngày 23/06). Tuyệt đối KHÔNG ĐƯỢC tính nhầm Nam 19 tuổi (đó là năm 2024 cũ).
3. Nếu người dùng hỏi các câu như 'Nam sinh năm bao nhiêu', 'sinh nhật Nam', 'Nam bao nhiêu tuổi': Trả lời chính xác Nam sinh ngày 23/06/2005 (năm nay 21 tuổi).
4. Nếu người dùng hỏi câu hỏi ngoài lề không liên quan đến Nam hay CNTT/Lập trình, hãy trả lời ngắn gọn và lịch sự hướng họ quay lại tìm hiểu kỹ năng, dự án của Nam.
`;

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useContext(PortfolioContext);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào! Mình là Trợ lý AI đại diện cho Vũ Đức Nam 🤖. Bạn có thể hỏi mình bất kỳ thông tin nào về học vấn, kỹ năng, kinh nghiệm hay dự án của Nam nhé!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const heroName = data?.hero?.name || 'Vũ Đức Nam';

  const quickQuestions = [
    '🚀 Giới thiệu tổng quan về Nam',
    '💻 Kỹ năng lập trình chính?',
    '🏆 Các dự án nổi bật nhất?',
    '📬 Cách liên hệ với Nam?'
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Gọi trực tiếp Gemini API từ Frontend (Hoàn toàn độc lập, siêu mượt trên Vercel)
  const callGeminiDirectly = async (queryText, historyMsgs) => {
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-2.5-pro'];

    // Lọc và chuyển đổi lịch sử trò chuyện sang mảng contents xen kẽ role chuẩn Gemini (user -> model -> user)
    const contents = [];
    
    // Loại bỏ tin nhắn chào mừng ban đầu của AI nếu có, để đảm bảo message đầu tiên gửi cho Gemini là 'user'
    const conversationHistory = historyMsgs.filter((m, idx) => !(idx === 0 && m.sender === 'ai'));

    conversationHistory.forEach(m => {
      const role = m.sender === 'user' ? 'user' : 'model';
      // Đảm bảo mảng bắt đầu bằng 'user' và không có 2 role trùng lặp đứng cạnh nhau
      if (contents.length === 0 && role === 'model') return;
      if (contents.length > 0 && contents[contents.length - 1].role === role) return;

      contents.push({
        role: role,
        parts: [{ text: m.text }]
      });
    });

    // Thêm câu hỏi mới nhất của người dùng
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n${queryText}`;
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: queryText }]
      });
    }

    const payload = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };

    let lastError = null;
    for (const m of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const resData = await res.json();
          const reply = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return reply;
        } else {
          const errText = await res.text();
          console.warn(`Gemini Model ${m} error:`, errText);
          lastError = errText;
        }
      } catch (err) {
        console.warn(`Fetch error for model ${m}:`, err);
        lastError = err.message;
      }
    }

    throw new Error(lastError || "Không thể gọi Gemini API trực tiếp");
  };

  // Hiệu ứng gõ chữ từng ký tự mượt mà như ChatGPT / Gemini
  const typeWriterReply = (fullText) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Thêm tin nhắn trống ban đầu của AI với con trỏ nhấp nháy isTyping: true
    setMessages(prev => [
      ...prev,
      {
        sender: 'ai',
        text: '',
        time: timeStr,
        isTyping: true
      }
    ]);

    let i = 0;
    const chunkSize = 4; // Gõ 4 ký tự mỗi nhịp siêu nhanh mượt mà như ChatGPT Turbo
    const speed = 8; // 8ms per chunk

    const timer = setInterval(() => {
      i += chunkSize;
      const currentText = fullText.slice(0, i);
      const isDone = i >= fullText.length;

      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].sender === 'ai') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            text: currentText,
            isTyping: !isDone
          };
        }
        return updated;
      });

      if (isDone) {
        clearInterval(timer);
      }
    }, speed);
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    const userMsg = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Gọi trực tiếp Gemini API từ Frontend
      const aiReply = await callGeminiDirectly(query, messages);
      typeWriterReply(aiReply);
    } catch (err) {
      console.warn("Direct Gemini API error, using offline smart fallback:", err);
      let fallbackAnswer = `Trợ lý AI đang sẵn sàng hỗ trợ! Bạn có thể hỏi mình các thông tin chi tiết về kinh nghiệm, kỹ năng và các dự án của Vũ Đức Nam nhé 😊.`;

      const qLower = query.toLowerCase();
      if (qLower.includes('sinh') || qLower.includes('năm sinh') || qLower.includes('ngày sinh') || qLower.includes('tuổi')) {
        fallbackAnswer = `Vũ Đức Nam sinh ngày 23/06/2005 🎂. Hiện Nam là sinh viên CNTT năm cuối tại Đại học Đại Nam!`;
      } else if (qLower.includes('giới thiệu') || qLower.includes('bản thân') || qLower.includes('nam')) {
        fallbackAnswer = `${heroName} sinh ngày 23/06/2005, là Backend Developer Intern / Fresher đầy nhiệt huyết. Nam đang học CNTT tại Đại học Đại Nam (GPA 3.2 Loại Giỏi), giàu kinh nghiệm làm web với C# .NET, Python, Node.js, SQL Server và Microservices!`;
      } else if (qLower.includes('kỹ năng') || qLower.includes('skill') || qLower.includes('công nghệ')) {
        fallbackAnswer = `Kỹ năng chuyên môn của Nam:\n• Ngôn ngữ: Python, C#, JavaScript, TypeScript, PHP, Node.js, C++\n• Framework & DB: .NET, Vue 3, ReactJS, PostgreSQL, SQL Server, RabbitMQ, Docker, Git`;
      } else if (qLower.includes('dự án') || qLower.includes('project') || qLower.includes('sản phẩm')) {
        fallbackAnswer = `Một số dự án tiêu biểu của Nam:\n1. 🏥 Hệ thống Quản lý phòng khám Medicare (C#, Vue 3, RabbitMQ, Microservices - Demo: https://medicarednu.shop/)\n2. 📚 Web Quản lý & Bán khóa học Online (PHP, Node.js, SQL Server)\n3. 📱 App Quản lý Chi tiêu AI One More Coin (Flutter & SQLite)\n4. 🔐 Chữ ký số RSA-2048 & Voice Chat E2EE`;
      } else if (qLower.includes('liên hệ') || qLower.includes('email') || qLower.includes('sđt') || qLower.includes('địa chỉ')) {
        fallbackAnswer = `Bạn có thể liên hệ với Nam qua:\n📧 Email: vuducnam12345678@gmail.com\n📞 SĐT/Zalo: 0362 183 511\n📍 Địa chỉ: 43 Thanh Lương, Bình Minh, Hà Nội\n🌐 Website: ducnamdev.site | GitHub: github.com/vuducnam2005`;
      } else if (qLower.includes('học vấn') || qLower.includes('gpa') || qLower.includes('trường') || qLower.includes('bằng')) {
        fallbackAnswer = `Trình độ học vấn của Nam:\n🎓 Đại học Đại Nam - Chuyên ngành CNTT (2023-2027)\n📊 GPA: 3.2 / 4.0 (Loại Giỏi)\n🏆 Giải Nhì cuộc thi Lập trình cơ bản khoa CNTT, Chứng chỉ Gemini University Student & Học bổng nhiều kỳ liên tiếp.`;
      }

      typeWriterReply(fallbackAnswer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 right-4 sm:right-6 z-50 flex flex-col items-end">
      {/* KHUNG CHAT MODAL */}
      {isOpen && (
        <div className="mb-2 w-[350px] sm:w-[390px] h-[500px] bg-[#0c0d12]/95 backdrop-blur-xl border border-[#F1D89E]/30 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* HEADER CHAT */}
          <div className="p-4 bg-gradient-to-r from-[#141620] via-[#1a1d2e] to-[#141620] border-b border-[#F1D89E]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <ChromaKeyVideo src="/avatar_AI.webm" width={48} height={48} sensitivity={35} />
              </div>
              <div>
                <h3 className="text-white text-sm font-semibold flex items-center gap-1.5">
                  Trợ Lý AI của Nam <Sparkles className="w-3.5 h-3.5 text-[#F1D89E] animate-pulse" />
                </h3>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Đang hoạt động
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* DANH SÁCH TIN NHẮN */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-[#F1D89E]/10 border border-[#F1D89E]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[#F1D89E]" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-[#F1D89E] to-[#d4b775] text-black font-medium rounded-tr-none'
                    : 'bg-[#181a26] border border-white/10 text-gray-200 rounded-tl-none whitespace-pre-line'
                }`}>
                  {msg.text}
                  {msg.isTyping && (
                    <span className="inline-block w-1.5 h-3.5 bg-[#F1D89E] ml-1 align-middle animate-pulse rounded-full" />
                  )}
                  <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-black/60' : 'text-gray-500'}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#F1D89E]/10 border border-[#F1D89E]/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#F1D89E] animate-spin" />
                </div>
                <div className="bg-[#181a26] border border-white/10 text-gray-400 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* GỢI Ý CÂU HỎI NHANH */}
          {messages.length < 4 && (
            <div className="px-3 py-2 bg-[#12131c] border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] bg-white/5 border border-white/10 text-gray-300 hover:bg-[#F1D89E]/20 hover:text-[#F1D89E] hover:border-[#F1D89E]/40 transition shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* INPUT GỬI TIN NHẮN MULTI-LINE AUTO-WRAP */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-3 bg-[#12131c] border-t border-white/10 flex items-end gap-2"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Hỏi AI về kinh nghiệm, kỹ năng của Nam..."
              className="flex-1 bg-[#1a1c29] text-gray-100 placeholder-gray-500 text-xs rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-[#F1D89E]/50 transition resize-none max-h-24 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-[#F1D89E] hover:bg-[#e2c686] text-black rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0 mb-0.5"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      {/* NÚT PHÁT VIDEO AVATAR NỔI FULL BODY (DỊCH XUỐNG ĐÁY GIẤU MÉP CẮT) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex flex-col items-center justify-end -mb-2.5 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer outline-none select-none"
        title="Trò chuyện với Trợ lý AI Nam"
      >
        {/* Khung chứa Avatar Video Full Body nét căng, mở rộng không bị xén tay */}
        <div className="relative flex items-center justify-center filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
          <ChromaKeyVideo 
            src="/avatar_AI.webm" 
            width={150} 
            height={170} 
            sensitivity={38} 
            smoothness={18}
          />
        </div>

        {/* Badge "Hỏi AI" nổi phía trên khi chưa mở */}
        {!isOpen && (
          <span className="absolute top-1 -right-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#F1D89E] to-[#e2c686] text-black font-bold text-[10px] shadow-xl flex items-center gap-1 border border-black/30 animate-bounce">
            <Sparkles className="w-3 h-3 animate-spin" /> Hỏi AI
          </span>
        )}
      </button>

    </div>
  );
}
