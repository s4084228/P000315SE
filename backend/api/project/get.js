// GET /api/projects/get?id=uuid
import { supabase } from '../../lib/db.js';
import { setCors, handleOptions } from '../../middleware/cors.js';
import { success, error, sendResponse } from '../../utils/response.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'GET') {
        return sendResponse(res, error('Method not allowed', 405));
    }

    try {
        const user = await requireAuth(req, res);
        if (!user) return;

        const { id } = req.query;

        if (!id) {
            return sendResponse(res, error('ID is required', 400));
        }

        const { data: project, error: dbError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .eq('userId', user.id) // Ensure user owns the project
            .single();

        if (dbError) {
            if (dbError.code === 'PGRST116') {
                return sendResponse(res, error('Project not found', 404));
            }
            return sendResponse(res, error('Database error', 500, dbError.message));
        }

        return sendResponse(res, success(project));

    } catch (err) {
        console.error('API Error:', err);
        return sendResponse(res, error('Internal server error', 500));
    }
}