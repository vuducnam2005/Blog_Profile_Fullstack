import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { API_BASE_URL } from '../../config';

// import ReactQuill from 'react-quill';
// import 'react-quill/dist/quill.snow.css';

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [tieuDe, setTieuDe] = useState("");
  const [tomTat, setTomTat] = useState("");
  const [theLoai, setTheLoai] = useState("");
  const [hinhAnhBia, setHinhAnhBia] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      axios.get(`${API_BASE_URL}/api/posts/${id}`).then(res => {
        setTieuDe(res.data.tieuDe || "");
        setTomTat(res.data.tomTat || "");
        setTheLoai(res.data.theLoai || "");
        setHinhAnhBia(res.data.hinhAnhBia || "");
        setNoiDung(res.data.noiDung || "");
      }).catch(err => console.error(err));
    }
  }, [id, isEdit]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/uploads`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setHinhAnhBia(`${API_BASE_URL}${res.data.url}`);
    } catch (err) {
      alert("Lỗi tải ảnh lên!");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tieuDe || !noiDung) {
      alert("Tiêu đề và Nội dung là bắt buộc!");
      return;
    }
    
    setLoading(true);
    const payload = { tieuDe, noiDung, tomTat, theLoai, hinhAnhBia };

    try {
      if (isEdit) {
        payload.maBaiViet = parseInt(id, 10);
        await axios.put(`${API_BASE_URL}/api/posts/${id}`, payload);
        navigate(`/post/${id}`);
      } else {
        const res = await axios.post(`${API_BASE_URL}/api/posts`, payload);
        navigate(`/post/${res.data.maBaiViet}`);
      }
    } catch (err) {
      alert("Kết nối CSDL thất bại! Vui lòng kiểm tra lại quá trình Update-Database.");
      console.error(err);
    }
    setLoading(false);
  };

  // Cấu hình Toolbar cho Trình soạn thảo Rich Text
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image', 'code-block'],
      ['clean'],
      [{ 'color': [] }]
    ]
  };

  return (
    <div className="pt-24 max-w-5xl mx-auto px-4 relative z-20 pb-20">
      <div className="glass rounded-3xl p-8 bg-black/60 shadow-2xl border border-white/10">
        <button onClick={() => navigate('/')} className="inline-flex items-center text-gray-400 hover:text-white mb-6 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/20 transition-all">
          <ArrowLeft className="w-5 h-5 mr-2" /> Quay lại Trang Chủ
        </button>

        <h1 className="text-3xl font-bold mb-8 text-[#F1D89E] border-b border-white/10 pb-4">
          {isEdit ? "Chỉnh sửa Bài viết" : "Thêm Bài viết Blog Kỹ Thuật (Nâng Cao)"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Cột Trái - Thông tin cơ bản */}
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-[#F1D89E] uppercase tracking-wider mb-2">Tiêu đề Bài viết</label>
                    <input 
                    type="text" 
                    required 
                    value={tieuDe} 
                    onChange={e => setTieuDe(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F1D89E] focus:ring-1 focus:ring-[#F1D89E] transition-all"
                    placeholder="Ví dụ: Lập trình C# cơ bản..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-[#F1D89E] uppercase tracking-wider mb-2">Tóm tắt ngắn (Excerpt)</label>
                    <textarea 
                    rows="3"
                    value={tomTat} 
                    onChange={e => setTomTat(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F1D89E] focus:ring-1 focus:ring-[#F1D89E] transition-all"
                    placeholder="Mô tả tóm tắt nội dung bài sẽ hiện ngoài trang chủ..."
                    ></textarea>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-[#F1D89E] uppercase tracking-wider mb-2">Thể loại (Category / Tags)</label>
                    <input 
                    type="text" 
                    value={theLoai} 
                    onChange={e => setTheLoai(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F1D89E] focus:ring-1 focus:ring-[#F1D89E] transition-all"
                    placeholder="Ví dụ: Backend, ReactJS, ASP.NET..."
                    />
                </div>
            </div>

            {/* Cột Phải - Ảnh Bìa */}
            <div className="space-y-4">
                <label className="block text-sm font-semibold text-[#F1D89E] uppercase tracking-wider mb-2">Ảnh bìa (Thumbnail)</label>
                <div className="w-full aspect-[16/9] border-2 border-dashed border-gray-600 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden bg-black/60 hover:border-[#F1D89E]/50 transition-colors">
                    {hinhAnhBia ? (
                        <img src={hinhAnhBia.startsWith('http') ? hinhAnhBia : `${API_BASE_URL}${hinhAnhBia}`} alt="Cover Preview" className="absolute inset-0 w-full h-full object-contain" />
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                            <span className="text-sm">Chưa có ảnh bìa</span>
                        </div>
                    )}
                    
                    {/* Bọc Upload Input */}
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    
                    {/* Lớp màng mờ trên ảnh báo đang tải */}
                    {uploading && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                            <div className="w-8 h-8 border-4 border-[#F1D89E] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-400 italic text-center">Bấm trực tiếp vào vùng nét đứt để Tải Ảnh Lên (Khuyến nghị tỷ lệ 16:9 ngang)</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-[#F1D89E] uppercase tracking-wider mb-3">Nội dung chi tiết (Rich Text / HTML)</label>
            <div className="bg-white text-black rounded-xl overflow-hidden p-2">
                <textarea 
                    value={noiDung} 
                    onChange={e => setNoiDung(e.target.value)} 
                    className="w-full h-80 outline-none p-4"
                    placeholder="Tính năng Rich Text tạm khóa do lỗi xung đột React 19. Hãy dùng mã HTML thô vào đây..."
                ></textarea>
            </div>
          </div>

          <button 
            disabled={loading || uploading}
            type="submit" 
            className="mt-12 flex items-center justify-center gap-2 bg-[#F1D89E] text-black font-bold text-lg py-4 rounded-xl hover:bg-white hover:shadow-[0_0_20px_rgba(241,216,158,0.5)] transition-all disabled:opacity-50 tracking-widest uppercase"
          >
            {loading ? "ĐANG LƯU BÀI..." : (
              <><Save className="w-6 h-6" /> {isEdit ? "CẬP NHẬT BÀI VIẾT" : "XUẤT BẢN BÀI VIẾT"}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
