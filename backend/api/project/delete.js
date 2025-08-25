// DELETE /api/projects/delete
import { supabase } from '../../lib/db.js';
import { deleteFromBlob } from '../../lib/storage.js';
import { setCors, handleOptions } from '../../middleware/cors.js';
import { success, error, sendResponse } from '../../utils/response.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'DELETE') {
        return sendResponse(res, error('Method not allowed', 405));
    }

    try {
        const user = await requireAuth(req, res);
        if (!user) return;

        const { id } = req.body;

        if (!id) {
            return sendResponse(res, error('ID is required', 400));
        }

        // First get the project to know its type
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('type')
            .eq('id', id)
            .eq('userId', user.id)
            .single();

        if (fetchError) {
            return sendResponse(res, error('Project not found', 404));
        }

        // Delete from Supabase
        const { error: dbError } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('userId', user.id);

        if (dbError) {
            return sendResponse(res, error('Database error', 500, dbError.message));
        }

        // Delete from Blob storage
        try {
            await deleteFromBlob(`${project.type}s/${id}.json`);
        } catch (blobError) {
            console.error('Blob deletion failed:', blobError);
        }

        return sendResponse(res, success(null, `${project.type} deleted successfully`));

    } catch (err) {
        console.error('API Error:', err);
        return sendResponse(res, error('Internal server error', 500));
    }
}