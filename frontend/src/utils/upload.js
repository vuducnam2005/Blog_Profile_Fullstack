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
        // 1. Fetch upload signature from backend
        const sigRes = await axios.get(`${API_BASE_URL}/api/uploads/signature`);
        
        if (sigRes.data.useLocal) {
            // Fallback: If no Cloudinary config on server, upload standard way
            const formData = new FormData();
            formData.append('file', file);
            const res = await axios.post(`${API_BASE_URL}/api/uploads`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data.url;
        }

        // 2. We have a signature, let's do Direct Upload to Cloudinary
        const { signature, timestamp, cloudName, apiKey } = sigRes.data;
        
        // Determine Cloudinary resource type
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
        
        return uploadRes.data.secure_url;
        
    } catch (error) {
        console.error('File Upload Error:', error);
        throw error;
    }
};
