import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import { PortfolioContext } from '../../context/PortfolioContext';
import { uploadFile } from '../../utils/upload';

export default function ConfigEditor() {
    const navigate = useNavigate();
    const { fetchConfig } = useContext(PortfolioContext);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    const heroRef = useRef(null);
    const projectsRef = useRef(null);
    const experiencesRef = useRef(null);
    const skillsRef = useRef(null);
    const albumRef = useRef(null);
    const statsRef = useRef(null);

    const scrollToSection = (ref) => {
        if (ref.current) {
            const offset = 100;
            const top = ref.current.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    const tabs = [
        { id: 'hero', label: 'Thông tin cốt lõi', ref: heroRef },
        { id: 'projects', label: 'Dự án mẫu', ref: projectsRef },
        { id: 'experiences', label: 'Kinh nghiệm', ref: experiencesRef },
        { id: 'skills', label: 'Kỹ năng', ref: skillsRef },
        { id: 'album', label: 'Quản lý Album', ref: albumRef },
        { id: 'stats', label: 'Thống kê', ref: statsRef },
    ];

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/config`)
            .then(res => {
                const fetchedConfig = res.data || {};
                if (!fetchedConfig.skillsCategories || fetchedConfig.skillsCategories.length === 0) {
                    fetchedConfig.skillsCategories = [
                        { id: 1, title: 'Backend & Database', items: ['C# / .NET 9', 'Python', 'SQL Server', 'RESTful API', 'Entity Framework', 'C++'] },
                        { id: 2, title: 'Frontend', items: ['ReactJS', 'Vite', 'Three.js', 'TailwindCSS', 'HTML / CSS', 'JavaScript'] },
                        { id: 3, title: 'Khác (Tools/Soft)', items: ['Word/Excel', 'Giao tiếp tốt', 'Tư duy Logic', 'Đọc hiểu English', 'Làm việc nhóm'] }
                    ];
                }
                if (!fetchedConfig.stats || fetchedConfig.stats.length === 0) {
                    fetchedConfig.stats = [
                        { id: 1, value: '1+', label: 'Năm mài dũa code' },
                        { id: 2, value: '3+', label: 'Dự án hoàn thành' },
                        { id: 3, value: '10+', label: 'Công nghệ nền tảng' }
                    ];
                }
                setConfig(fetchedConfig);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleChange = (section, field, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleArrayChange = (section, index, field, value) => {
        setConfig(prev => {
            const newArray = [...prev[section]];
            newArray[index] = { ...newArray[index], [field]: value };
            return { ...prev, [section]: newArray };
        });
    };

    const handleAddArrayItem = (section, template) => {
        setConfig(prev => ({
            ...prev,
            [section]: [template, ...(prev[section] || [])]
        }));
    };

    const handleRemoveArrayItem = (section, index) => {
        setConfig(prev => {
            const newArray = [...prev[section]];
            newArray.splice(index, 1);
            return { ...prev, [section]: newArray };
        });
    };

    const handleSkillsChange = (e) => {
        const value = e.target.value;
        const skillsArray = value.split(',').map(s => s.trim());
        setConfig(prev => ({
            ...prev,
            hero: { ...prev.hero, skills: skillsArray }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post(`${API_BASE_URL}/api/config`, config);
            await fetchConfig(); // Cập nhật dữ liệu toàn cục ngay lập tức
            alert("Đã lưu lại Cấu hình Giao diện thành công! Trở lại Trang Chủ để thấy thay đổi.");
        } catch (error) {
            console.error(error);
            alert("Gặp lỗi trong quá trình lưu dữ liệu.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-white text-center pt-32">Đang tải cấu hình...</div>;

    if (!config) return <div className="text-white text-center pt-32">Data Error</div>;

    return (
        <div className="pt-24 max-w-6xl mx-auto px-4 relative z-20 pb-20">
            <div className="glass rounded-3xl p-8 bg-black/60 shadow-2xl border border-white/10">
                <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                    <div>
                        <button onClick={() => navigate('/')} className="inline-flex items-center text-gray-400 hover:text-[#F1D89E] mb-4 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5 mr-2" /> Quay lại
                        </button>
                        <h1 className="text-3xl lg:text-4xl font-extrabold text-[#F1D89E] uppercase tracking-wide">
                            Tùy chỉnh Giao Diện Cổng Thông Tin (Portfolio CMS)
                        </h1>
                        <p className="text-gray-400 mt-2">Toàn bộ thông tin thay đổi ở đây sẽ tự động cập nhật lên Homepage.</p>
                    </div>
                    
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-[#F1D89E] hover:bg-white text-black font-bold uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg transition-all hover:scale-105"
                    >
                        {saving ? "ĐANG LƯU..." : <><Save className="w-5 h-5 inline mr-2"/> CẬP NHẬT TẤT CẢ LÊN TRANG CHỦ</>}
                    </button>
                </div>

                {/* --- SUB TABS THAO TÁC NHANH --- */}
                <div className="flex flex-wrap gap-3 mb-10 sticky top-[80px] z-[60] bg-black/80 backdrop-blur-md p-4 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] border border-[#F1D89E]/20">
                    <span className="text-[#F1D89E] w-full md:w-auto text-sm font-bold flex items-center mr-2 uppercase tracking-wide">
                        Đi nhanh đến:
                    </span>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => scrollToSection(tab.ref)}
                            className="px-4 py-2 rounded-lg bg-black/60 border border-white/20 text-gray-300 hover:text-[#F1D89E] hover:bg-white/10 hover:border-[#F1D89E]/50 transition-all font-bold text-sm shadow-sm"
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* --- SECTIONS --- */}
                
                {/* 1. HERO & INFO */}
                <section ref={heroRef} className="mb-14 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[#F1D89E] text-black flex items-center justify-center">1</span> 
                        Thông Tin Cốt Lõi (Khu vực Top & Giới thiệu)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
                        {/* Khu vực Upload Avatar */}
                        <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-6 mb-2 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
                            <div className="w-24 h-24 rounded-full border-2 border-[#F1D89E] shadow-[0_0_15px_rgba(241,216,158,0.2)] bg-black overflow-hidden shrink-0 flex items-center justify-center">
                                {config.hero?.avatar ? (
                                    <img src={config.hero.avatar.startsWith('http') ? config.hero.avatar : `${API_BASE_URL}${config.hero.avatar}`} alt="Avatar preview" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px] text-gray-500">Trống</span>
                                )}
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-[10px] text-[#F1D89E] font-bold uppercase tracking-wider mb-2 block">Cập Nhật Ảnh Đại Diện Mới (Avatar)</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        try {
                                            const url = await uploadFile(file);
                                            handleChange("hero", "avatar", url);
                                        } catch (err) {
                                            console.error("Lỗi tải ảnh:", err);
                                            alert("Lỗi khi tải ảnh lên máy chủ. Bạn nhớ bật Server C# Backend nhé!");
                                        }
                                    }}
                                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-[#F1D89E] file:text-black hover:file:bg-white transition-all file:cursor-pointer cursor-pointer bg-black/40 border border-white/10 rounded-xl"
                                />
                            </div>
                        </div>
                        {/* Khu vực Upload CV */}
                        <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-6 mb-2 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
                            <div className="flex-1 w-full">
                                <label className="text-[10px] text-[#00D0C8] font-bold uppercase tracking-wider mb-2 block">Tải Lên File CV (.pdf)</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="file" 
                                        accept=".pdf"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            try {
                                                const url = await uploadFile(file);
                                                handleChange("hero", "cvUrl", url);
                                            } catch (err) {
                                                console.error("Lỗi tải CV:", err);
                                                alert("Lỗi khi tải CV lên máy chủ.");
                                            }
                                        }}
                                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-[#00D0C8] file:text-black hover:file:bg-white transition-all file:cursor-pointer cursor-pointer bg-black/40 border border-white/10 rounded-xl"
                                    />
                                </div>
                                {config.hero?.cvUrl && (
                                    <p className="text-xs text-[#00D0C8] mt-3 font-semibold">✅ Đã lưu CV trên máy chủ: {config.hero.cvUrl.split('/').pop()}</p>
                                )}
                            </div>
                        </div>
                        {/* Khu vực Upload Nhạc Nền (Audio) */}
                        <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-6 mb-2 bg-black/40 p-5 rounded-2xl border border-[#F1D89E]/20 shadow-[0_0_15px_rgba(241,216,158,0.1)]">
                            <div className="flex-1 w-full">
                                <label className="text-[10px] text-[#F1D89E] font-bold uppercase tracking-wider mb-2 block">Tải Lên Nhạc Nền Trang Web (.mp3, .wav)</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="file" 
                                        accept="audio/*"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            // Validate size < 100MB
                                            if (file.size > 100 * 1024 * 1024) {
                                                alert("File nhạc quá lớn. Vui lòng chọn file dưới 100MB.");
                                                e.target.value = '';
                                                return;
                                            }
                                            
                                            // Handle upload
                                            setUploadingMedia(true);
                                            try {
                                                const url = await uploadFile(file);
                                                handleChange("hero", "backgroundMusic", url);
                                            } catch (err) {
                                                console.error("Lỗi tải Audio:", err);
                                                alert("Lỗi khi tải Nhạc lên máy chủ.");
                                            } finally {
                                                setUploadingMedia(false);
                                            }
                                        }}
                                        disabled={uploadingMedia}
                                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-[#F1D89E] file:text-black hover:file:bg-white transition-all file:cursor-pointer cursor-pointer bg-black/40 border border-white/10 rounded-xl"
                                    />
                                </div>
                                {uploadingMedia ? (
                                    <p className="text-xs text-emerald-400 mt-3 font-semibold animate-pulse flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                                        Đang đưa nhạc lên đám mây, vui lòng chờ...
                                    </p>
                                ) : config.hero?.backgroundMusic ? (
                                    <p className="text-xs text-[#F1D89E] mt-3 font-semibold">🎵 Đã lưu Nhạc nền: {config.hero.backgroundMusic.split('/').pop()}</p>
                                ) : null}
                                <p className="text-[10px] text-gray-500 mt-2 italic">Trang web sẽ hiện popup hỏi khách khi vòng đời Audio bắt đầu. Max: 100MB, upload chạy thẳng lên server qua trình duyệt (Direct Upload).</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[#F1D89E] font-bold uppercase tracking-wider mb-2 block">Tên Hiển Thị</label>
                            <input value={config.hero?.name || ""} onChange={e => handleChange("hero", "name", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" />
                        </div>
                        <div>
                            <label className="text-xs text-[#F1D89E] font-bold uppercase tracking-wider mb-2 block">Chức Danh Mũi Nhọn</label>
                            <input value={config.hero?.title || ""} onChange={e => handleChange("hero", "title", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-[#F1D89E] font-bold uppercase tracking-wider mb-2 block">Mô Tả Sinh Học (Bio)</label>
                            <textarea rows="2" value={config.hero?.bio || ""} onChange={e => handleChange("hero", "bio", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" />
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Email</label>
                            <input value={config.hero?.email || ""} onChange={e => handleChange("hero", "email", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Số điện thoại</label>
                            <input value={config.hero?.phone || ""} onChange={e => handleChange("hero", "phone", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Quê quán</label>
                            <input value={config.hero?.hometown || ""} onChange={e => handleChange("hero", "hometown", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" placeholder="Hợp Nhất, Đoan Hùng, Phú Thọ" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Nơi ở hiện tại</label>
                            <input value={config.hero?.residence || ""} onChange={e => handleChange("hero", "residence", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" placeholder="Hà Nội" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">GitHub / Website Link</label>
                            <input value={config.hero?.github || ""} onChange={e => handleChange("hero", "github", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" placeholder="/vuducnam2005" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Link Facebook</label>
                            <input value={config.hero?.facebook || ""} onChange={e => handleChange("hero", "facebook", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" placeholder="https://facebook.com/..." />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Link Instagram</label>
                            <input value={config.hero?.instagram || ""} onChange={e => handleChange("hero", "instagram", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" placeholder="https://instagram.com/..." />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Khóa Học / Đại học</label>
                            <input value={config.hero?.university || ""} onChange={e => handleChange("hero", "university", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Chi tiết GPA/Niên Khóa</label>
                            <input value={config.hero?.gpa || ""} onChange={e => handleChange("hero", "gpa", e.target.value)} className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-[#F1D89E]" />
                        </div>

                        <div className="md:col-span-2 mt-4 border-t border-white/10 pt-4">
                            <label className="text-xs text-[#F1D89E] font-bold uppercase tracking-wider mb-2 block">Thẻ Kỹ Năng (Cách nhau bởi dấu phẩy)</label>
                            <input 
                                value={(config.hero?.skills || []).join(', ')} 
                                onChange={handleSkillsChange} 
                                className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-[#F1D89E] outline-none focus:border-[#F1D89E] font-mono text-sm" 
                                placeholder="Python, C#, SQL..."
                            />
                        </div>
                    </div>
                </section>

                {/* 2. DỰ ÁN */}
                <section ref={projectsRef} className="mb-14 scroll-mt-24">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[#F1D89E] text-black flex items-center justify-center">2</span> 
                            Thư Viện Dự Án Mẫu
                        </h2>
                        <button 
                            onClick={() => handleAddArrayItem('projects', { id: Date.now(), title: "Dự án mới", description: "", tech: [], github: "", color: "from-[#F1D89E]/10" })}
                            className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg hover:bg-emerald-500/40 transition-colors"
                        >
                            <Plus className="w-4 h-4"/> Thêm thẻ Dự án
                        </button>
                    </div>

                    <div className="space-y-6">
                        {config.projects?.map((item, index) => (
                            <div key={item.id} className="relative bg-white/5 p-6 rounded-2xl border border-white/10 group hover:border-[#F1D89E]/30 transition-all">
                                <button onClick={() => handleRemoveArrayItem('projects', index)} className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-red-400/10 p-2 rounded-lg hover:bg-red-400 hover:text-white">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Tên Dự Án</label>
                                        <input value={item.title || ""} onChange={e => handleArrayChange('projects', index, 'title', e.target.value)} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-white outline-none focus:border-[#F1D89E] font-bold text-lg" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Link Github</label>
                                        <input value={item.github || ""} onChange={e => handleArrayChange('projects', index, 'github', e.target.value)} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-blue-400 outline-none focus:border-[#F1D89E] font-mono text-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Nội dung Mô tả ngắn</label>
                                        <textarea rows="2" value={item.description || ""} onChange={e => handleArrayChange('projects', index, 'description', e.target.value)} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-gray-300 outline-none focus:border-[#F1D89E]" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Tech Stack (Phân cách dấu phẩy)</label>
                                        <input value={(item.tech || []).join(', ')} onChange={e => {
                                            const arr = e.target.value.split(',').map(s => s.trim());
                                            handleArrayChange('projects', index, 'tech', arr);
                                        }} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-[#F1D89E] outline-none focus:border-[#F1D89E] font-mono text-xs" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!config.projects || config.projects.length === 0) && <p className="text-gray-500 italic p-6 text-center border border-dashed border-gray-600 rounded-2xl">Chưa có dự án nào</p>}
                    </div>
                </section>

                {/* 3. EXPERIENCE */}
                <section ref={experiencesRef} className="mb-14 scroll-mt-24">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[#F1D89E] text-black flex items-center justify-center">3</span> 
                            Kinh Nghiệm & Học Vấn
                        </h2>
                        <button 
                            onClick={() => handleAddArrayItem('experiences', { id: Date.now(), year: "Thời gian", title: "Vai trò", company: "Tổ chức", description: "Bổ sung chi tiết..." })}
                            className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg hover:bg-emerald-500/40 transition-colors"
                        >
                            <Plus className="w-4 h-4"/> Thêm thẻ Kinh nghiệm
                        </button>
                    </div>

                    <div className="space-y-4 border-l-2 border-[#F1D89E]/20 pl-6 ml-3">
                        {config.experiences?.map((item, index) => (
                            <div key={item.id} className="relative bg-white/5 p-5 rounded-2xl border border-white/10 group hover:border-[#F1D89E]/30 transition-all">
                                <button onClick={() => handleRemoveArrayItem('experiences', index)} className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-red-400/10 p-2 rounded-lg hover:bg-red-400 hover:text-white">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-12">
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] text-[#F1D89E] font-bold uppercase tracking-wider mb-1 block">Dấu mốc thời gian</label>
                                        <input value={item.year || ""} onChange={e => handleArrayChange('experiences', index, 'year', e.target.value)} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-[#F1D89E] outline-none focus:border-[#F1D89E] font-mono font-bold" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Tên Chức danh / Bằng Cấp</label>
                                        <input value={item.title || ""} onChange={e => handleArrayChange('experiences', index, 'title', e.target.value)} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-white font-bold outline-none focus:border-[#F1D89E]" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Cơ quan / Công ty</label>
                                        <input value={item.company || ""} onChange={e => handleArrayChange('experiences', index, 'company', e.target.value)} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-gray-300 outline-none focus:border-[#F1D89E]" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Tiểu tiết công việc</label>
                                        <textarea rows="2" value={item.description || ""} onChange={e => handleArrayChange('experiences', index, 'description', e.target.value)} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-gray-400 outline-none focus:border-[#F1D89E] text-sm" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. KỸ NĂNG & CÔNG NGHỆ */}
                <section ref={skillsRef} className="mb-14 scroll-mt-24">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[#F1D89E] text-black flex items-center justify-center">4</span> 
                            Kỹ năng & Công nghệ
                        </h2>
                        <button 
                            onClick={() => handleAddArrayItem('skillsCategories', { id: Date.now(), title: "Danh mục mới", items: [] })}
                            className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg hover:bg-emerald-500/40 transition-colors"
                        >
                            <Plus className="w-4 h-4"/> Thêm danh mục
                        </button>
                    </div>

                    <div className="space-y-4">
                        {config.skillsCategories?.map((cat, index) => (
                            <div key={cat.id || index} className="relative bg-white/5 p-5 rounded-2xl border border-white/10 group hover:border-[#F1D89E]/30 transition-all">
                                <button onClick={() => handleRemoveArrayItem('skillsCategories', index)} className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-red-400/10 p-2 rounded-lg hover:bg-red-400 hover:text-white">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] text-[#F1D89E] font-bold uppercase tracking-wider mb-1 block">Tên danh mục</label>
                                        <input value={cat.title || ""} onChange={e => handleArrayChange('skillsCategories', index, 'title', e.target.value)} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-white font-bold outline-none focus:border-[#F1D89E]" placeholder="Ví dụ: BACKEND & DATABASE" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Danh sách Kỹ năng (Cách nhau bằng dấu phẩy)</label>
                                        <input value={(cat.items || []).join(', ')} onChange={e => handleArrayChange('skillsCategories', index, 'items', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-gray-300 outline-none focus:border-[#F1D89E]" placeholder="Ví dụ: Python, SQL Server..." />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!config.skillsCategories || config.skillsCategories.length === 0) && <p className="text-gray-500 italic p-6 text-center border border-dashed border-gray-600 rounded-2xl">Chưa có danh mục kỹ năng nào.</p>}
                    </div>
                </section>

                {/* 5. QUẢN LÝ ALBUM (ẢNH & VIDEO) */}
                <section ref={albumRef} className="mb-14 scroll-mt-24">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[#F1D89E] text-black flex items-center justify-center">5</span>
                            Quản Lý Album (Ảnh & Video)
                        </h2>
                        <div className="flex items-center gap-4">
                            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${uploadingMedia ? 'bg-gray-500/20 text-gray-400' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40'}`}>
                                {uploadingMedia ? <span className="animate-pulse">⏳ Đang tải...</span> : <><Plus className="w-4 h-4"/> Thêm Media</>}
                                <input 
                                    type="file" 
                                    accept="image/*,video/*"
                                    multiple
                                    className="hidden"
                                    disabled={uploadingMedia}
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files);
                                        if (!files.length) return;
                                        setUploadingMedia(true);
                                        
                                        try {
                                            for (let i = 0; i < files.length; i++) {
                                                const file = files[i];
                                                const formData = new FormData();
                                                formData.append('file', file);
                                                
                                                try {
                                                    const url = await uploadFile(file);
                                                    const ext = url.split('.').pop().toLowerCase();
                                                    const type = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext) ? 'video' : 'image';
                                                    
                                                    const newItem = {
                                                        id: Date.now() + Math.random(),
                                                        url: url,
                                                        type: type
                                                    };
                                                    
                                                    setConfig(prev => ({
                                                        ...prev,
                                                        album: [newItem, ...(prev.album || [])]
                                                    }));
                                                } catch (err) {
                                                    console.error(`Lỗi tải media (${file.name}):`, err);
                                                    alert(`Tải lên thất bại file: ${file.name}. Có thể do file quá nặng hoặc mạng yếu.`);
                                                }
                                            }
                                        } finally {
                                            setUploadingMedia(false);
                                            e.target.value = null;
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {config.album?.map((item, index) => {
                            let url = item.url.startsWith('http') ? item.url : `${API_BASE_URL}${item.url}`;
                            
                            // Hàm tạo thumbnail tối ưu qua Cloudinary
                            const getOptimizedThumb = (sourceUrl, type) => {
                                if (!sourceUrl.includes('cloudinary.com')) return sourceUrl;
                                const parts = sourceUrl.split('/upload/');
                                if (parts.length !== 2) return sourceUrl;
                                
                                // Thumbnail nhỏ (300x300), nén mạnh, định dạng tự động
                                let transformation = 'c_fill,g_auto,h_300,w_300,f_auto,q_auto';
                                if (type === 'video') {
                                    // Video thumbnail là ảnh JPG từ frame ở giây 0.5
                                    transformation += ',so_0.5';
                                    return (parts[0] + '/upload/' + transformation + '/' + parts[1]).replace(/\.[^/.]+$/, '.jpg');
                                }
                                return parts[0] + '/upload/' + transformation + '/' + parts[1];
                            };

                            const thumbUrl = getOptimizedThumb(url, item.type);

                            return (
                                <div key={item.id || index} className="relative group rounded-xl overflow-hidden glass border border-white/10 bg-black/40 aspect-square">
                                    {/* Sử dụng ảnh thumbnail cho cả video và image ở trang quản trị để load cực nhanh */}
                                    <img 
                                        src={thumbUrl} 
                                        className="w-full h-full object-cover" 
                                        alt="Album preview" 
                                        loading="lazy"
                                    />
                                    
                                    <div className="absolute inset-0 pointer-events-none bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                        <span className="text-white text-[10px] font-bold uppercase py-1 px-3 bg-white/20 rounded-full mb-8">{item.type}</span>
                                    </div>

                                    <button 
                                        onClick={() => handleRemoveArrayItem('album', index)} 
                                        className="absolute top-2 right-2 text-white bg-red-500/80 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:scale-110 transition-all z-30"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            );
                        })}
                        {(!config.album || config.album.length === 0) && (
                            <div className="col-span-2 md:col-span-4 p-8 text-center border border-dashed border-gray-600 rounded-2xl">
                                <p className="text-gray-500 italic">Chưa có Hình ảnh hoặc Video nào trong Album.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 6. THỐNG KÊ SỐ LIỆU */}
                <section ref={statsRef} className="mb-14 scroll-mt-24">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[#F1D89E] text-black flex items-center justify-center">5</span>
                            Thống Kê Số Liệu (Trang Giới Thiệu)
                        </h2>
                        <button
                            onClick={() => handleAddArrayItem('stats', { id: Date.now(), value: '0+', label: 'Tiêu đề mới' })}
                            className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg hover:bg-emerald-500/40 transition-colors"
                        >
                            <Plus className="w-4 h-4"/> Thêm số liệu
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {config.stats?.map((stat, index) => (
                            <div key={stat.id || index} className="relative bg-white/5 p-5 rounded-2xl border border-white/10 group hover:border-[#F1D89E]/30 transition-all text-center">
                                <button onClick={() => handleRemoveArrayItem('stats', index)} className="absolute top-3 right-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-red-400/10 p-1.5 rounded-lg hover:bg-red-400 hover:text-white">
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                                <div className="mb-3">
                                    <label className="text-[10px] text-[#F1D89E] font-bold uppercase tracking-wider mb-1 block">Con số hiển thị</label>
                                    <input value={stat.value || ''} onChange={e => handleArrayChange('stats', index, 'value', e.target.value)} className="w-full bg-black/40 border border-transparent p-3 rounded-lg text-[#F1D89E] text-3xl font-black text-center outline-none focus:border-[#F1D89E]" placeholder="1+" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Nhãn mô tả</label>
                                    <input value={stat.label || ''} onChange={e => handleArrayChange('stats', index, 'label', e.target.value)} className="w-full bg-black/40 border border-transparent p-2 rounded-lg text-gray-300 text-sm text-center outline-none focus:border-[#F1D89E]" placeholder="Năm kinh nghiệm" />
                                </div>
                            </div>
                        ))}
                        {(!config.stats || config.stats.length === 0) && <p className="text-gray-500 italic p-6 text-center border border-dashed border-gray-600 rounded-2xl md:col-span-3">Chưa có số liệu nào.</p>}
                    </div>
                </section>

                <div className="mt-14 border-t border-white/10 pt-8 flex justify-center">
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-[#F1D89E] hover:bg-white text-black font-extrabold uppercase tracking-widest px-12 py-5 rounded-2xl shadow-[0_0_20px_rgba(241,216,158,0.4)] transition-all hover:scale-105"
                    >
                        {saving ? "ĐANG LƯU..." : "CẬP NHẬT TẤT CẢ LÊN TRANG CHỦ"}
                    </button>
                </div>
            </div>
        </div>
    );
}
