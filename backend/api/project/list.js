// GET /api/projects/list?type=project&status=draft&page=1&limit=10
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

        const {
            type = 'project',  // 'project', 'toc', or 'all'
            page = 1,
            limit = 10,
            status,
            search
        } = req.query;

        let query = supabase
            .from('projects')
            .select('*', { count: 'exact' })
            .eq('userId', user.id)
            .order('created_at', { ascending: false });

        // Filter by type (project/toc/all)
        if (type !== 'all') {
            query = query.eq('type', type);
        }

        // Add other filters
        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`projectTitle.ilike.%${search}%,projectAim.ilike.%${search}%`);
        }

        // Add pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: projects, error: dbError, count } = await query;

        if (dbError) {
            return sendResponse(res, error('Database error', 500, dbError.message));
        }

        return sendResponse(res, success({
            projects,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        }));

    } catch (err) {
        console.error('API Error:', err);
        return sendResponse(res, error('Internal server error', 500));
    }
}