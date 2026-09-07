import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Uploads a file for chat attachment with full metadata
 * @param {File} file The file object to upload
 * @returns {Promise<{ url: string, fileName: string, fileSize: number, fileType: string, isImage: boolean }>}
 */
export const uploadChatAttachment = async (file) => {
    try {
        const fileType = file.type || '';
        const fileName = file.name || 'file';
        const fileSize = file.size || 0;
        const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
        const isImage = fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(extension);

        // 1. Lấy thông tin chữ ký từ backend
        let sigData = null;
        try {
            const sigRes = await axios.get(`${API_BASE_URL}/api/uploads/signature`);
            sigData = sigRes.data;
        } catch (sigErr) {
            console.warn('[uploadChatAttachment] Không thể lấy chữ ký Cloudinary, chuyển sang upload qua server:', sigErr);
        }

        // 2. Thử upload trực tiếp lên Cloudinary nếu có cấu hình
        if (sigData && !sigData.useLocal && sigData.signature && sigData.cloudName) {
            try {
                const { signature, timestamp, cloudName, apiKey } = sigData;
                let resourceType = 'raw';
                if (isImage) {
                    resourceType = 'image';
                } else if (fileType.startsWith('video/') || fileType.startsWith('audio/') || ['mp4', 'mov', 'avi', 'webm', 'mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
                    resourceType = 'video';
                }

                const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
                const formData = new FormData();
                formData.append('file', file);
                formData.append('api_key', apiKey);
                formData.append('timestamp', timestamp);
                formData.append('signature', signature);

                const uploadRes = await axios.post(cloudinaryUrl, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (uploadRes.data?.secure_url) {
                    console.log('[uploadChatAttachment] Upload Cloudinary thành công:', uploadRes.data.secure_url);
                    return {
                        url: uploadRes.data.secure_url,
                        fileName,
                        fileSize,
                        fileType: extension || fileType,
                        isImage
                    };
                }
            } catch (cloudErr) {
                console.warn('[uploadChatAttachment] Upload Cloudinary trực tiếp thất bại, fallback sang server:', cloudErr);
            }
        }

        // 3. Fallback: Upload qua endpoint /api/uploads của backend server
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(`${API_BASE_URL}/api/uploads`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        console.log('[uploadChatAttachment] Upload server thành công:', res.data.url);
        return {
            url: res.data.url,
            fileName: res.data.fileName || fileName,
            fileSize: res.data.fileSize || fileSize,
            fileType: res.data.fileType || extension || fileType,
            isImage
        };
    } catch (error) {
        console.error('File Upload Error:', error);
        throw error;
    }
};

/**
 * Uploads a file directly to Cloudinary or falls back to traditional server upload.
 * Returns the URL string for backward compatibility.
 * @param {File} file The file object to upload
 * @returns {Promise<string>} The uploaded file URL
 */
export const uploadFile = async (file) => {
    const res = await uploadChatAttachment(file);
    return res.url;
};
