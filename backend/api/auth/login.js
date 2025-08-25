// POST /api/auth/login
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/db.js';
import { setCors, handleOptions } from '../../middleware/cors.js';
import { success, error, sendResponse } from '../../utils/response.js';
import { validateUser } from '../../lib/validation.js';

export default async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') {
        return sendResponse(res, error('Method not allowed', 405));
    }

    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return sendResponse(res, error('Email and password are required', 400));
        }

        // Find user
        const { data: user, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (dbError || !user) {
            return sendResponse(res, error('Invalid credentials', 401));
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return sendResponse(res, error('Invalid credentials', 401));
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove sensitive data
        const { password_hash, ...userWithoutPassword } = user;

        return sendResponse(res, success({
            user: userWithoutPassword,
            token
        }, 'Login successful'));

    } catch (err) {
        console.error('Login Error:', err);
        return sendResponse(res, error('Internal server error', 500));
    }
}