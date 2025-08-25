// POST /api/export/pdf
import { generatePDF } from '../../lib/export.js';
import { supabase } from '../../lib/db.js';
import { setCors, handleOptions } from '../../middleware/cors.js';
import { success, error, sendResponse } from '../../utils/response.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') {
        return sendResponse(res, error('Method not allowed', 405));
    }

    try {
        const user = await requireAuth(req, res);
        if (!user) return;

        const { id } = req.body;

        if (!id) {
            return sendResponse(res, error('Project ID is required', 400));
        }

        // Get project data
        const { data: project, error: dbError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .eq('userId', user.id)
            .single();

        if (dbError) {
            return sendResponse(res, error('Project not found', 404));
        }

        // Generate PDF
        const pdfBuffer = await generatePDF(project);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${project.projectTitle}.pdf"`);

        return res.status(200).send(pdfBuffer);

    } catch (err) {
        console.error('PDF Export Error:', err);
        return sendResponse(res, error('Failed to generate PDF', 500));
    }
}