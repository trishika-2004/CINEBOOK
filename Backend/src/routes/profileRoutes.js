import express from 'express';
import { verifySupabaseAuth } from '../Middleware/supabaseAuth.js';
import supabaseAdmin from '../Middleware/supabaseAuth.js';

const router = express.Router();

router.get('/me', verifySupabaseAuth, async (req, res) => {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
    
    if (error) throw error;

    res.json({
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username || user.email,
      role: user.user_metadata?.role || 'user',
      avatar_url: user.user_metadata?.avatar_url || null,
      created_at: user.created_at
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.put('/me', verifySupabaseAuth, async (req, res) => {
  try {
    const { username, avatar_url } = req.body;
    
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      {
        user_metadata: {
          ...req.user.user_metadata,
          username: username || req.user.user_metadata?.username,
          avatar_url: avatar_url || req.user.user_metadata?.avatar_url
        }
      }
    );

    if (error) throw error;

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        username: data.user.user_metadata?.username,
        role: data.user.user_metadata?.role,
        avatar_url: data.user.user_metadata?.avatar_url
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;