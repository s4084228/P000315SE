// PUT /api/projects/update
import { supabase } from '../../lib/db.js';
import { storeInBlob } from '../../lib/storage.js';
import { validateProject } from '../../lib/validation.js';
import { setCors, handleOptions } from '../../middleware/cors.js';
import { success, error, sendResponse } from '../../utils/response.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'PUT') {
        return sendResponse(res, error('Method not allowed', 405));
    }

    try {
        const user = await requireAuth(req, res);
        if (!user) return;

        const { id, ...updateData } = req.body;

        if (!id) {
            return sendResponse(res, error('ID is required', 400));
        }

        // Validate input
        const validationErrors = validateProject(updateData);
        if (validationErrors.length > 0) {
            return sendResponse(res, error('Validation failed', 400, validationErrors));
        }

        const updatedProject = {
            ...updateData,
            updated_at: new Date().toISOString()
        };

        // Update in Supabase
        const { data: project, error: dbError } = await supabase
            .from('projects')
            .update(updatedProject)
            .eq('id', id)
            .eq('userId', user.id) // Ensure user owns the project
            .select()
            .single();

        if (dbError) {
            return sendResponse(res, error('Database error', 500, dbError.message));
        }

        // Update in Blob storage
        try {
            await storeInBlob(`${project.type}s/${id}.json`, project);
        } catch (blobError) {
            console.error('Blob update failed:', blobError);
        }

        return sendResponse(res, success(project, `${project.type} updated successfully`));

    } catch (err) {
        console.error('API Error:', err);
        return sendResponse(res, error('Internal server error', 500));
    }
}