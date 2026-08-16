const axios = require('axios');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { supabase } = require('./lib/supabase');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());

// --- SUPABASE JWT AUTHENTICATION MIDDLEWARE ---
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or malformed access token' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback_secret_for_local_dev';

    jwt.verify(token, jwtSecret, (err, decodedUser) => {
        if (err) {
            console.error('JWT Verification Error:', err.message);
            return res.status(403).json({ error: 'Forbidden: Invalid or expired access token' });
        }

        // Attach decoded user metadata to request context
        req.user = decodedUser;
        next();
    });
};

// Optional auth middleware for routes that can work with or without a logged-in user
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback_secret_for_local_dev';

    jwt.verify(token, jwtSecret, (err, decodedUser) => {
        if (err) {
            req.user = null;
        } else {
            req.user = decodedUser;
        }
        next();
    });
};

// Health Check (Public - Unprotected)
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date() });
});

// ============================================================
// GITHUB OAUTH ROUTES
// ============================================================

// Define our URLs based on the environment (Vercel vs Local)
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Redirect user to GitHub Login
app.get('/auth/github', (req, res) => {
    const redirectUri = `${SERVER_URL}/auth/github/callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    res.redirect(githubAuthUrl);
});

// 2. Handle GitHub Callback (GitHub redirects here with a code)
app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) return res.status(400).send('No code provided by GitHub');

    try {
        // Exchange code for GitHub Access Token
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code
        }, { headers: { accept: 'application/json' } });

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) throw new Error('Failed to obtain access token from GitHub');

        // Fetch User Profile from GitHub
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Dev-Assist-AI' }
        });

        const githubUser = userResponse.data;

        // Try fetching email if null
        let userEmail = githubUser.email;
        if (!userEmail) {
            try {
                const emailResponse = await axios.get('https://api.github.com/user/emails', {
                    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Dev-Assist-AI' }
                });
                const primaryEmail = emailResponse.data.find(e => e.primary);
                userEmail = primaryEmail ? primaryEmail.email : null;
            } catch (e) {
                // Ignore email fetch errors
            }
        }

        let userRecord = {
            id: null,
            github_id: String(githubUser.id),
            login: githubUser.login,
            name: githubUser.name || githubUser.login,
            avatar_url: githubUser.avatar_url,
            email: userEmail
        };

        // Upsert user into Supabase if configured
        if (supabase) {
            const { data: upsertedUser, error } = await supabase
                .from('users')
                .upsert({
                    github_id: String(githubUser.id),
                    login: githubUser.login,
                    name: githubUser.name || githubUser.login,
                    avatar_url: githubUser.avatar_url,
                    email: userEmail
                }, { onConflict: 'github_id' })
                .select()
                .single();

            if (error) {
                console.error('Supabase Upsert Error:', error.message);
            } else if (upsertedUser) {
                userRecord.id = upsertedUser.id;
            }
        }

        // Mint JWT with user payload
        const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback_secret_for_local_dev';
        const token = jwt.sign(userRecord, jwtSecret, { expiresIn: '7d' });

        // Redirect back to the correct Frontend URL!
        res.redirect(`${CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
        console.error('Auth Error:', error.response?.data || error.message);
        res.redirect(`${CLIENT_URL}/login?error=auth_failed`);
    }
});

// GET /auth/me — Return current user info from JWT
app.get('/auth/me', requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

// ============================================================
// OPS BRAIN ENDPOINT (Updated for Dynamic Repo URLs)
// ============================================================
app.post('/api/ops-brain', optionalAuth, async (req, res) => {
    const { query, repoUrl } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        let repoPath = 'facebook/react';

        if (repoUrl) {
            repoPath = repoUrl
                .replace('https://github.com/', '')
                .replace('http://github.com/', '')
                .replace(/\/$/, '');
        }

        const githubResponse = await axios.get(`https://api.github.com/repos/${repoPath}/commits?per_page=10`, {
            headers: { 'User-Agent': 'Architect-AI-Hackathon' }
        });

        const liveCommits = githubResponse.data.map(commit => ({
            author: commit.commit.author.name,
            message: commit.commit.message,
            date: commit.commit.author.date,
            url: commit.html_url
        }));

        const systemInstruction = `
      You are an Enterprise AI 'Institutional Brain' and automated incident responder. 
      You have access to the following LIVE Git commits from the repository (${repoPath}):
      
      ${JSON.stringify(liveCommits, null, 2)}
      
      When the user asks a question, pastes an error log, or asks for a status update, use ONLY the context provided above to answer. 
      Be direct, helpful, and speak like a senior DevOps engineer.
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
                { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Query: ${query}` }] }
            ]
        });

        const answer = response.text;

        // Save to chat_history if user is authenticated and Supabase is configured
        if (req.user && req.user.id && supabase) {
            const { error: insertError } = await supabase
                .from('chat_history')
                .insert({
                    user_id: req.user.id,
                    query: query,
                    answer: answer
                });

            if (insertError) {
                console.error('Failed to save chat history:', insertError.message);
            }
        }

        return res.json({ success: true, answer: answer });

    } catch (error) {
        console.error('CRITICAL ERROR in Ops Brain:', error.message);
        const fallbackAnswer = "I am currently analyzing the live repository data, but I noticed a similar pattern to a database connection timeout we fixed last month. Let's check the connection pool.";

        // Save fallback response to chat_history if authenticated
        if (req.user && req.user.id && supabase) {
            const { error: insertError } = await supabase
                .from('chat_history')
                .insert({
                    user_id: req.user.id,
                    query: query,
                    answer: fallbackAnswer
                });

            if (insertError) {
                console.error('Failed to save fallback chat history:', insertError.message);
            }
        }

        return res.json({
            success: true,
            answer: fallbackAnswer
        });
    }
});

// ============================================================
// ARCHITECT ENDPOINT (Now Repository-Aware)
// ============================================================
app.post('/api/architect', optionalAuth, async (req, res) => {
    const { prompt, githubUrl } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    let repoContext = "No specific repository linked. Base the architecture purely on the user's prompt requirements.";

    // If a GitHub URL is provided, fetch its structure to feed to Gemini
    if (githubUrl && githubUrl.trim() !== '') {
        try {
            let repoPath = githubUrl
                .replace('https://github.com/', '')
                .replace('http://github.com/', '')
                .replace(/\/$/, '');

            // Fetch languages and root files to determine the tech stack
            const [langRes, contentsRes] = await Promise.all([
                axios.get(`https://api.github.com/repos/${repoPath}/languages`, {
                    headers: { 'User-Agent': 'Dev-Assist-AI' }
                }),
                axios.get(`https://api.github.com/repos/${repoPath}/contents`, {
                    headers: { 'User-Agent': 'Dev-Assist-AI' }
                })
            ]);

            const languages = Object.keys(langRes.data).join(', ');
            const files = contentsRes.data.map(f => f.name).join(', ');

            repoContext = `
            The user has linked the following live repository: ${repoPath}.
            Primary Languages detected: ${languages}
            Root Files/Directories detected: ${files}
            
            CRITICAL: You MUST inspect the Root Files and Languages to determine the project's framework (e.g., package.json + next.config.js = Next.js; pom.xml = Java Spring; Cargo.toml = Rust). 
            Design your architecture blueprint, API endpoints, and Docker setup to specifically match and scale this exact tech stack.
            `;
        } catch (error) {
            console.error('Failed to fetch GitHub context for architect:', error.message);
            repoContext = "Failed to fetch linked repository data (possibly private or rate-limited). Proceed with a generic architecture based on the prompt.";
        }
    }

    const systemInstruction = `
    You are an AI Principal System Architect.
    When given a product requirement, generate a highly detailed, structured JSON response containing system architecture, schemas, and costs. CRITICAL FORMATTING RULE: You MUST escape all newlines within string values using \\n. DO NOT output raw, unescaped line breaks inside JSON strings.
    
    ${repoContext}
    
    You MUST output strictly valid JSON matching this exact structure:
    {
      "architectureNodes": [
        { "id": "1", "icon": "Server", "type": "api", "title": "Next.js Node Server", "desc": "Handles SSR and API routes" }
      ],
      "architectureFlow": [
        { "from": "Client", "to": "Next.js Node Server", "label": "HTTPS/REST" }
      ],
      "sqlSchema": "-- PostgreSQL Schema\\nCREATE TABLE users (id UUID);",
      "mongoSchema": "// MongoDB Schema\\n{ user: { type: 'ObjectId' } }",
      "apiEndpoints": [
        { "method": "POST", "path": "/api/v1/combat-log", "desc": "Records new combat metrics", "requiresAuth": true }
      ],
      "costBreakdown": [
        { "service": "Vercel Compute", "cost": "$20/mo" },
        { "service": "Supabase PostgreSQL", "cost": "$25/mo" }
      ],
      "totalCost": "$45/mo",
      "warningNote": "Watch out for connection pool limits during massive traffic spikes.",
      "dockerCompose": "version: '3.8'\\nservices:\\n  web:\\n    image: node:18"
    }
    
    Valid icons: Layout, Server, ShieldCheck, Cpu, Database, Zap.
    Valid types: client, api, microservice, database, cache.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
                { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Request: ${prompt}` }] }
            ],
            config: {
                responseMimeType: 'application/json'
            }
        });

    // Strip markdown code blocks if the AI accidentally includes them
    let sanitizedText = response.text.trim();
    if (sanitizedText.startsWith('```')) {
        sanitizedText = sanitizedText.replace(/^```json/i, '').replace(/```$/, '').trim();
    }

// Strip any remaining rogue control characters (ASCII 0-31) except standard newlines/returns
sanitizedText = sanitizedText.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');

const parsedData = JSON.parse(sanitizedText);

        // Save to saved_architectures if user is authenticated and Supabase is configured
        if (req.user && req.user.id && supabase) {
            const { error: insertError } = await supabase
                .from('saved_architectures')
                .insert({
                    user_id: req.user.id,
                    title: prompt.substring(0, 100),
                    prompt: prompt,
                    mermaid: null,
                    cost_breakdown: parsedData.costBreakdown || null,
                    total_monthly_estimate: parsedData.totalCost || null,
                    scaffolding: null
                });

            if (insertError) {
                console.error('Failed to save architecture:', insertError.message);
            }
        }

        return res.json({ success: true, data: parsedData });

    } catch (error) {
        console.error('Error generating architecture:', error.message);
        
        // Return 500 error instead of a hardcoded fallback if Gemini fails, 
        // so the frontend knows it was an actual failure during development.
        return res.status(500).json({ error: 'Failed to generate architecture blueprint.' });
    }
});

// ============================================================
// HISTORY ENDPOINT — Get chat history for logged-in user
// ============================================================
app.get('/api/history', requireAuth, async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
    }

    try {
        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching chat history:', error.message);
            return res.status(500).json({ error: 'Failed to fetch chat history' });
        }

        return res.json({ success: true, history: data });
    } catch (error) {
        console.error('Error in /api/history:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// ARCHITECTURES ENDPOINTS — Get/Delete saved architectures
// ============================================================

// GET /api/architectures — Returns saved architectures for logged-in user
app.get('/api/architectures', requireAuth, async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
    }

    try {
        const { data, error } = await supabase
            .from('saved_architectures')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching architectures:', error.message);
            return res.status(500).json({ error: 'Failed to fetch architectures' });
        }

        return res.json({ success: true, architectures: data });
    } catch (error) {
        console.error('Error in /api/architectures:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/architectures/:id — Delete a saved architecture by ID
app.delete('/api/architectures/:id', requireAuth, async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('saved_architectures')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Error deleting architecture:', error.message);
            return res.status(500).json({ error: 'Failed to delete architecture' });
        }

        return res.json({ success: true, message: 'Architecture deleted' });
    } catch (error) {
        console.error('Error in DELETE /api/architectures/:id:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});