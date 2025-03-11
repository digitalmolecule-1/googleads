// server.js
const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const path = require('path');

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SESSION_SECRET } = require('./config');
const { getCampaigns, updateAdText } = require('./googleAdsClient');
const { optimizeAdText } = require('./adOptimizer');

const app = express();
const port = 5000;

// Middleware to parse JSON and URL-encoded bodies.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure sessions
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// CORS middleware (for development only; adjust for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000'); // React dev server
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Create OAuth2 client using credentials from client_secrets.json
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Route: Start OAuth flow
app.get('/auth', (req, res) => {
  const scopes = ['https://www.googleapis.com/auth/adwords'];
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
  res.redirect(authUrl);
});

// Route: OAuth callback
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    // Save tokens in session
    req.session.tokens = tokens;
    // Set credentials for future API calls
    oauth2Client.setCredentials(tokens);
    res.redirect('http://localhost:3000'); // Redirect to React app
  } catch (error) {
    console.error('Error during OAuth callback', error);
    res.status(500).send('Authentication failed');
  }
});

// Middleware to check authentication
function ensureAuthenticated(req, res, next) {
  if (req.session.tokens) {
    oauth2Client.setCredentials(req.session.tokens);
    return next();
  }
  res.status(401).json({ error: 'User not authenticated' });
}

// API Endpoint: Get campaigns
app.get('/api/campaigns', ensureAuthenticated, async (req, res) => {
  try {
    const campaigns = await getCampaigns(oauth2Client);
    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Error fetching campaigns' });
  }
});

// API Endpoint: Optimize Ad Text
app.post('/api/optimize', ensureAuthenticated, async (req, res) => {
  const { adText } = req.body;
  if (!adText) {
    return res.status(400).json({ error: 'Missing adText' });
  }
  try {
    const optimizedText = await optimizeAdText(adText);
    res.json({ optimizedText });
  } catch (error) {
    console.error('Error optimizing ad text:', error);
    res.status(500).json({ error: 'Error optimizing ad text' });
  }
});

// API Endpoint: Update Campaign (ad text)
app.post('/api/updateCampaign', ensureAuthenticated, async (req, res) => {
  const { adGroupAdId, newText } = req.body;
  if (!adGroupAdId || !newText) {
    return res.status(400).json({ error: 'Missing adGroupAdId or newText' });
  }
  try {
    const updateResult = await updateAdText(oauth2Client, adGroupAdId, newText);
    res.json({ updateResult });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Error updating campaign' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
