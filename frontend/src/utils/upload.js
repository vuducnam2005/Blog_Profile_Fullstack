import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Uploads a file directly to Cloudinary using a signature from the backend
 * or falls back to traditional server upload if Cloudinary is not configured.
 * @param {File} file The file object to upload
 * @returns {Promise<string>} The uploaded file URL
 */
export const uploadFile = async (file) => {
    try {
        // 1. Lấy thông tin chữ ký từ backend
        let sigData = null;
        try {
            const sigRes = await axios.get(`${API_BASE_URL}/api/uploads/signature`);
            sigData = sigRes.data;
        } catch (sigErr) {
            console.warn('[uploadFile] Không thể lấy chữ ký Cloudinary, chuyển sang upload qua server:', sigErr);
        }

        // 2. Thử upload trực tiếp lên Cloudinary nếu có cấu hình
        if (sigData && !sigData.useLocal && sigData.signature && sigData.cloudName) {
            try {
                const { signature, timestamp, cloudName, apiKey } = sigData;
                const fileType = file.type || '';
                let resourceType = 'image';
                if (fileType.startsWith('video/') || fileType.startsWith('audio/')) {
                    resourceType = 'video';
                } else if (fileType === 'application/pdf') {
                    resourceType = 'raw';
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
                    console.log('[uploadFile] Upload Cloudinary thành công:', uploadRes.data.secure_url);
                    return uploadRes.data.secure_url;
                }
            } catch (cloudErr) {
                console.warn('[uploadFile] Upload Cloudinary trực tiếp thất bại, fallback sang server:', cloudErr);
            }
        }

        // 3. Fallback: Upload qua endpoint /api/uploads của backend server
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(`${API_BASE_URL}/api/uploads`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        console.log('[uploadFile] Upload server thành công:', res.data.url);
        return res.data.url;
    } catch (error) {
        console.error('File Upload Error:', error);
        throw error;
    }
};
