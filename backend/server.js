require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client (Backend)
// We use the SERVICE_ROLE_KEY for admin tasks if needed, 
// or the ANON_KEY if we are just proxying with user token.
// For best security in this architecture, we might want to use the Service Role 
// to ensure we can bypass RLS where necessary or strictly enforce it.
// However, to just "forward" requests, we usually initialize a client per request 
// with the user's access_token. 
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or keys missing.');
  process.exit(1);
}

// Global Supabase Admin Client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(morgan('combined')); // Logging
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- AUTH PROXY ENDPOINTS ---

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, data } = req.body;
  try {
    const { data: result, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: { data }
    });

    if (error) throw error;
    res.json(result);
  } catch (error) {
    console.error('Signup Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: result, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    res.json(result);
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

// Helper to get authenticated client for a user
const getAuthenticatedClient = (token) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

// Generic Data Proxy (Example: Get User Profile)
// Mobile App sends GET /api/profile with Bearer Token
app.get('/api/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const client = getAuthenticatedClient(token);
    // Get the user to verify token and get ID
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) throw new Error('Invalid token');

    // Fetch profile
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generic Query Proxy (Advanced - For simpler frontend migration)
// CAUTION: This allows raw querying, ensure RLS is enabled on Supabase!
app.post('/api/rpc/:functionName', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { functionName } = req.params;
    const params = req.body;
    
    if (!token) return res.status(401).json({ error: 'Missing token' });
  
    try {
      const client = getAuthenticatedClient(token);
      const { data, error } = await client.rpc(functionName, params);
  
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
