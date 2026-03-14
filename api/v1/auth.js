/**
 * VALORA by MTDX - Authentication & KV Storage
 * Handles user authentication and data persistence with Vercel KV
 */

const { kv } = require('@vercel/kv');

// User session TTL (7 days)
const SESSION_TTL = 7 * 24 * 60 * 60;

// User data TTL (90 days - same as report validity)
const USER_DATA_TTL = 90 * 24 * 60 * 60;

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Validate user access via MTDX API
 */
async function validateUserAccess(userID) {
  try {
    const response = await fetch(
      `https://www.metadax.com.br/_functions/validateAccess?userID=${encodeURIComponent(userID)}`
    );
    const data = await response.json();

    return {
      valid: data.valid === true,
      plan: data.plan || 'free',
      name: data.name || null,
      email: data.email || null,
      expiresAt: data.expiresAt || null
    };
  } catch (error) {
    console.error('Validate Access Error:', error);
    return { valid: false };
  }
}

/**
 * Create user session
 */
async function createSession(userID, userData) {
  try {
    const sessionToken = generateSessionToken();
    const sessionKey = `session:${sessionToken}`;

    await kv.set(sessionKey, {
      userID,
      ...userData,
      createdAt: Date.now()
    }, { ex: SESSION_TTL });

    return sessionToken;
  } catch (error) {
    console.error('Create Session Error:', error);
    throw error;
  }
}

/**
 * Get user session
 */
async function getSession(sessionToken) {
  try {
    const sessionKey = `session:${sessionToken}`;
    const session = await kv.get(sessionKey);
    return session;
  } catch (error) {
    console.error('Get Session Error:', error);
    return null;
  }
}

/**
 * Delete user session
 */
async function deleteSession(sessionToken) {
  try {
    const sessionKey = `session:${sessionToken}`;
    await kv.del(sessionKey);
    return true;
  } catch (error) {
    console.error('Delete Session Error:', error);
    return false;
  }
}

/**
 * Refresh session TTL
 */
async function refreshSession(sessionToken) {
  try {
    const sessionKey = `session:${sessionToken}`;
    await kv.expire(sessionKey, SESSION_TTL);
    return true;
  } catch (error) {
    console.error('Refresh Session Error:', error);
    return false;
  }
}

// ============================================================================
// User Data Functions
// ============================================================================

/**
 * Save user data
 */
async function saveUserData(userID, data) {
  try {
    const userKey = `user:${userID}`;
    const existingData = await kv.get(userKey) || {};

    const updatedData = {
      ...existingData,
      ...data,
      lastUpdated: Date.now()
    };

    await kv.set(userKey, updatedData, { ex: USER_DATA_TTL });
    return updatedData;
  } catch (error) {
    console.error('Save User Data Error:', error);
    throw error;
  }
}

/**
 * Get user data
 */
async function getUserData(userID) {
  try {
    const userKey = `user:${userID}`;
    const data = await kv.get(userKey);
    return data;
  } catch (error) {
    console.error('Get User Data Error:', error);
    return null;
  }
}

/**
 * Save valuation history
 */
async function saveValuationHistory(userID, valuationData) {
  try {
    const historyKey = `history:${userID}`;
    const history = await kv.get(historyKey) || [];

    const newEntry = {
      id: generateId(),
      ...valuationData,
      createdAt: Date.now()
    };

    history.unshift(newEntry);

    // Keep only last 50 valuations
    if (history.length > 50) {
      history.pop();
    }

    await kv.set(historyKey, history, { ex: USER_DATA_TTL });
    return newEntry;
  } catch (error) {
    console.error('Save Valuation History Error:', error);
    throw error;
  }
}

/**
 * Get valuation history
 */
async function getValuationHistory(userID, limit = 10) {
  try {
    const historyKey = `history:${userID}`;
    const history = await kv.get(historyKey) || [];
    return history.slice(0, limit);
  } catch (error) {
    console.error('Get Valuation History Error:', error);
    return [];
  }
}

/**
 * Delete user data
 */
async function deleteUserData(userID) {
  try {
    await kv.del(`user:${userID}`);
    await kv.del(`history:${userID}`);
    return true;
  } catch (error) {
    console.error('Delete User Data Error:', error);
    return false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate session token
 */
function generateSessionToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 16)}`;
}

/**
 * Generate unique ID
 */
function generateId() {
  return `VAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// ============================================================================
// Express Router
// ============================================================================

const express = require('express');
const router = express.Router();

/**
 * POST /api/v1/auth/login
 * Login with userID
 */
router.post('/login', async (req, res) => {
  try {
    const { userID } = req.body;

    if (!userID) {
      return res.status(400).json({
        success: false,
        error: 'userID is required'
      });
    }

    // Validate access
    const validation = await validateUserAccess(userID);

    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid user ID or access denied'
      });
    }

    // Create session
    const sessionToken = await createSession(userID, {
      plan: validation.plan,
      name: validation.name,
      email: validation.email
    });

    res.json({
      success: true,
      data: {
        sessionToken,
        userID,
        plan: validation.plan,
        name: validation.name
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate'
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', async (req, res) => {
  try {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '');

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
  try {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'No session token provided'
      });
    }

    const session = await getSession(sessionToken);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }

    const userData = await getUserData(session.userID);

    res.json({
      success: true,
      data: {
        userID: session.userID,
        plan: session.plan,
        name: session.name,
        email: session.email,
        ...userData
      }
    });
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

/**
 * GET /api/v1/data/history
 * Get valuation history
 */
router.get('/history', async (req, res) => {
  try {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'No session token provided'
      });
    }

    const session = await getSession(sessionToken);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const history = await getValuationHistory(session.userID, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get History Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get history'
    });
  }
});

/**
 * POST /api/v1/data/save
 * Save user form data
 */
router.post('/save', async (req, res) => {
  try {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'No session token provided'
      });
    }

    const session = await getSession(sessionToken);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }

    const savedData = await saveUserData(session.userID, req.body);

    res.json({
      success: true,
      data: savedData
    });
  } catch (error) {
    console.error('Save Data Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save data'
    });
  }
});

module.exports = router;