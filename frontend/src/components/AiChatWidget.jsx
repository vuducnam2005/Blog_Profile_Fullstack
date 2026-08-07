import { useState, useRef, useEffect, useContext } from 'react';
import { X, Send, Bot, Sparkles } from 'lucide-react';
import ChromaKeyVideo from './ChromaKeyVideo';
import { PortfolioContext } from '../context/PortfolioContext';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];

function getStreamUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
}

function buildSystemInstruction(portfolioData) {
  const extra = portfolioData ? JSON.stringify(portfolioData) : '';
  return `Bạn là Trợ lý AI đại diện chính thức cho Vũ Đức Nam trên website Blog Profile cá nhân.
Hãy trả lời bằng tiếng Việt tự nhiên, chính xác, thân thiện và tuân thủ tuyệt đối quy tắc bố cục sau:

HỒ SƠ CÁ NHÂN VŨ ĐỨC NAM:
- Ngày sinh: 23/06/2005. Năm 2026 Nam 21 tuổi kể từ ngày 23/06.
- Định hướng: Backend Developer (Intern / Fresher).
- Điện thoại/Zalo: 0362 183 511.
- Email: vuducnam12345678@gmail.com.
- Quê quán: Hợp Nhất, Đoan Hùng, Phú Thọ.
- Địa chỉ hiện tại: 43 Thanh Lương, Bình Minh, Hà Nội.
- Website: ducnamdev.site. GitHub: https://github.com/vuducnam2005.
- Học CNTT tại Đại học Đại Nam giai đoạn 2023-2027, GPA 3.2/4.0, loại Giỏi.
- Thành tích: giải Nhì cuộc thi Tài năng Lập trình cơ bản khoa CNTT, chứng chỉ Gemini University Student, học bổng khuyến khích học tập nhiều kỳ.
- Kinh nghiệm: Tư vấn viên 03/2024-06/2025; Trợ giảng CNTT 09/2024-11/2025.
- Kỹ năng: Python, C#, JavaScript, TypeScript, PHP, Node.js, C++, .NET, Vue 3, ReactJS, Flutter, REST API, SQL Server, PostgreSQL, RabbitMQ, Docker, Git và SQLite.
- Dự án: Quản lý phòng khám Medicare (C#, Vue 3, RabbitMQ, PostgreSQL, Docker, Microservices); web quản lý và bán khóa học; ứng dụng quản lý chi tiêu AI One More Coin; chữ ký số RSA-2048; Voice Chat E2EE.

QUY TẮC BỐ CỤC VÀ PHẢN HỒI (BẮT BUỘC):
1. Xưng "Mình" hoặc "Trợ lý của Nam", gọi người hỏi là "bạn".
2. BỐ CỤC RÕ RÀNG, CHIA NHỎ Ý: Không được viết thành một đoạn văn dài dính liền. Luôn luôn chia câu trả lời thành từng mục nhỏ/gạch đầu dòng cụ thể (- hoặc •), xuống dòng giữa các ý và in đậm các từ khóa trọng tâm (**từ khóa**).
3. ĐÚNG TRỌNG TÂM: Ngắn gọn, súc tích, trình bày thoáng mắt dễ đọc trên cả máy tính và điện thoại.
4. Không bịa thông tin ngoài hồ sơ. Nếu hỏi chủ đề ngoài Nam hoặc CNTT, hướng nhẹ nhàng quay lại chủ đề chính.
5. Nếu bị công kích, bác bỏ dứt khoát dựa trên dữ kiện và sự tôn trọng.

Dữ liệu bổ sung từ hệ thống (có thể trống):
${extra}`;
}

function renderFormattedText(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const formattedLine = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIdx} className="font-semibold text-[#F1D89E]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ');

    return (
      <span key={lineIdx} className={isBullet ? 'block pl-2 my-1 border-l-2 border-[#F1D89E]/40 text-gray-100' : 'block my-0.5'}>
        {formattedLine}
      </span>
    );
  });
}

function normalizeForIntent(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function isPersonalAttackOnNam(value) {
  const normalized = normalizeForIntent(value);
  const targetsNam = ['nam', 'vu duc nam', 'duc nam'].some((term) => normalized.includes(term));
  const hostileTerms = [
    'ngu', 'dot', 'vo dung', 'bat tai', 'kem coi', 'rac ruoi', 'khong ra gi',
    'an hai', 'thang dien', 'oc cho', 'loser', 'fuck', 'shit', 'khon nan',
  ];

  return targetsNam && hostileTerms.some((term) => normalized.includes(term));
}

export default function AiChatWidget({
  initialOpen = false,
  isOpen: controlledIsOpen,
  onClose,
  panelOnly = false,
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(initialOpen);
  const isOpen = controlledIsOpen ?? internalIsOpen;
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
    chatEndRef.current?.scrollIntoView({ block: 'end' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Không cần health check backend — gọi Gemini trực tiếp từ frontend

  const streamReply = async (queryText, historyMessages) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);
    const replyId = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let started = false;
    let fullText = '';
    let displayedText = '';
    let timerId = null;

    try {
      // Build Gemini conversation history
      const contents = [];
      const filtered = historyMessages
        .filter((m) => m.text?.trim())
        .slice(-10);

      for (const m of filtered) {
        const role = m.sender === 'ai' ? 'model' : 'user';
        if (contents.length === 0 && role === 'model') continue;
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += '\n' + m.text.trim();
        } else {
          contents.push({ role, parts: [{ text: m.text.trim() }] });
        }
      }

      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts[0].text += '\n' + queryText.trim();
      } else {
        contents.push({ role: 'user', parts: [{ text: queryText.trim() }] });
      }

      let response = null;
      let lastError = null;

      // Thử từng model Gemini theo thứ tự ưu tiên (ưu tiên model lite có tốc độ phản hồi cực nhanh < 500ms)
      for (const modelName of GEMINI_MODELS) {
        try {
          const res = await fetch(getStreamUrl(modelName), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': GEMINI_API_KEY,
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: buildSystemInstruction(data) }]
              },
              contents,
              generationConfig: {
                temperature: 0.55,
                maxOutputTokens: 2048
              }
            }),
            signal: controller.signal
          });

          if (res.ok && res.body) {
            response = res;
            break;
          } else {
            const errText = await res.text();
            lastError = new Error(`Model ${modelName} trả về HTTP ${res.status}: ${errText}`);
          }
        } catch (e) {
          lastError = e;
        }
      }

      if (!response) {
        throw lastError || new Error('Tất cả các model Gemini đều không phản hồi.');
      }

      if (!response.body) {
        throw new Error('Trình duyệt không hỗ trợ đọc phản hồi streaming.');
      }

      // Vòng lặp gõ chữ mượt từng ký tự (typewriter) như ChatGPT / Gemini
      const startTypingLoop = () => {
        if (timerId) return;
        timerId = setInterval(() => {
          if (displayedText.length < fullText.length) {
            // Lấy từ 1 đến 3 ký tự mỗi nhịp (15ms) để tạo nhịp gõ chữ cực mượt
            const diff = fullText.length - displayedText.length;
            const step = diff > 30 ? 6 : diff > 10 ? 3 : 1;
            displayedText = fullText.slice(0, displayedText.length + step);

            setMessages((previous) => previous.map((message) =>
              message.id === replyId ? { ...message, text: displayedText } : message
            ));
          }
        }, 15);
      };

      const processLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) return;
        const json = trimmed.slice(5).trim();
        if (!json || json === '[DONE]') return;

        try {
          const parsed = JSON.parse(json);
          const parts = parsed.candidates?.[0]?.content?.parts;
          if (!parts) return;
          for (const part of parts) {
            if (!part.thought && part.text) {
              fullText += part.text;
            }
          }
        } catch {
          return;
        }

        if (!started && fullText) {
          started = true;
          displayedText = fullText.slice(0, 1);
          setMessages((previous) => [
            ...previous,
            { id: replyId, sender: 'ai', text: displayedText, time, isTyping: true }
          ]);
          startTypingLoop();
        }
      };

      // Đọc SSE stream từ Gemini
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processLine(line);
        }
      }

      if (buffer.trim()) {
        processLine(buffer);
      }

      if (!started || !fullText.trim()) {
        throw new Error('AI không trả về nội dung.');
      }

      // Chờ cho đến khi hiệu ứng gõ chữ in hết toàn bộ fullText
      await new Promise((resolve) => {
        const checkDone = setInterval(() => {
          if (displayedText.length >= fullText.length) {
            clearInterval(checkDone);
            if (timerId) clearInterval(timerId);
            resolve();
          }
        }, 30);
      });

      setMessages((previous) => previous.map((message) =>
        message.id === replyId ? { ...message, text: fullText, isTyping: false } : message
      ));
      return true;
    } catch (error) {
      if (timerId) clearInterval(timerId);
      if (started) {
        setMessages((previous) => previous.map((message) =>
          message.id === replyId ? { ...message, isTyping: false } : message
        ));
        error.partialReply = true;
      }
      throw error;
    } finally {
      if (timerId) clearInterval(timerId);
      clearTimeout(timeoutId);
    }
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
      try {
        await streamReply(query, messages);
        return;
      } catch (streamError) {
        console.warn('Streaming chat API failed:', streamError);
        if (streamError.partialReply) return;
      }

      // Giữ chatbot hữu ích khi backend hoặc Gemini tạm thời không sẵn sàng.
      let fallbackAnswer = `Kết nối AI đang tạm gián đoạn. Trong lúc chờ kết nối lại, mình vẫn có thể trả lời nhanh từ hồ sơ của Vũ Đức Nam 🤖: GPA 3.2, kỹ năng C# .NET, Python, SQL, Docker và nhiều dự án backend/fullstack.`;

      const qLower = query.toLowerCase();
      const qNormalized = normalizeForIntent(query);
      if (isPersonalAttackOnNam(query)) {
        fallbackAnswer = `Mình bác bỏ cách công kích đó. Đánh giá một người bằng lời lẽ xúc phạm là không chấp nhận được. Nếu muốn nhận xét về Nam, bạn hãy đưa ra dữ kiện cụ thể và trao đổi tôn trọng. Hồ sơ công khai cho thấy Nam học CNTT tại Đại học Đại Nam, đạt GPA loại Giỏi, có giải Nhì cuộc thi lập trình và đã thực hiện nhiều dự án backend/fullstack. Mình sẵn sàng trao đổi thẳng thắn dựa trên sự thật, nhưng sẽ không tiếp tục một cuộc nói chuyện chỉ nhằm hạ nhục cá nhân.`;
      } else if (qNormalized.includes('chao') || qNormalized.includes('hi') || qNormalized.includes('hello') || qNormalized.includes('alo')) {
        fallbackAnswer = `Xin chào bạn! Mình là Trợ lý AI đại diện cho Vũ Đức Nam 🤖. Bạn có thể hỏi mình bất kỳ câu hỏi nào về kinh nghiệm, kỹ năng, dự án hoặc thông tin liên hệ của Nam nhé!`;
      } else if (qNormalized.includes('que') || qNormalized.includes('que quan') || qNormalized.includes('sinh ra o dau')) {
        fallbackAnswer = `Quê quán của Vũ Đức Nam là Hợp Nhất, Đoan Hùng, Phú Thọ 📍. Hiện Nam đang sinh sống tại Hà Nội.`;
      } else if (qLower.includes('sinh') || qLower.includes('năm sinh') || qLower.includes('ngày sinh') || qLower.includes('tuổi')) {
        fallbackAnswer = `Vũ Đức Nam sinh ngày 23/06/2005 🎂. Năm nay 2026, Nam 21 tuổi và là sinh viên năm cuối ngành CNTT tại Đại học Đại Nam!`;
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

      setMessages((previous) => [
        ...previous,
        {
          sender: 'ai',
          text: fallbackAnswer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isTyping: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={panelOnly ? '' : 'ai-chat-launcher flex flex-col items-end'}>
      {/* KHUNG CHAT MODAL */}
      {isOpen && (
        <div className="ai-chat-panel mb-2 bg-[#0c0d12]/95 backdrop-blur-xl border border-[#F1D89E]/30 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* HEADER CHAT */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-[#141620] via-[#1a1d2e] to-[#141620] border-b border-[#F1D89E]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <ChromaKeyVideo width={48} height={48} />
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
              onClick={() => (onClose ? onClose() : setInternalIsOpen(false))}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* DANH SÁCH TIN NHẮN */}
          <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto overscroll-contain space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
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
                    : 'bg-[#181a24] text-gray-200 border border-white/10 rounded-tl-none shadow-md'
                }`}>
                  <div>{renderFormattedText(msg.text)}</div>
                  {msg.isTyping && (
                    <span className="inline-block w-1.5 h-3 ml-1 bg-[#F1D89E] animate-pulse" />
                  )}
                  <span className={`block text-[9px] mt-1 text-right ${
                    msg.sender === 'user' ? 'text-black/60' : 'text-gray-400'
                  }`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
            {loading && messages.at(-1)?.sender !== 'ai' && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-full bg-[#F1D89E]/10 border border-[#F1D89E]/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#F1D89E] animate-bounce" />
                </div>
                <div className="bg-[#181a24] p-3 rounded-2xl border border-white/10 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-ping" />
                  <div className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-ping delay-100" />
                  <div className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-ping delay-200" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* GỢI Ý CÂU HỎI MẪU */}
          <div className="px-3 py-2 bg-black/40 border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap text-[11px] bg-white/5 hover:bg-[#F1D89E]/20 text-gray-300 hover:text-[#F1D89E] border border-white/10 hover:border-[#F1D89E]/40 px-3 py-1.5 rounded-full transition-all shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Ô NHẬP TIN NHẮN */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-[#12131c] border-t border-white/10 flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi AI về kinh nghiệm, kỹ năng của Nam..."
              className="flex-1 bg-black/50 border border-white/10 focus:border-[#F1D89E] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-[#F1D89E] hover:bg-[#d4b775] disabled:opacity-40 text-black p-2.5 rounded-xl transition font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
