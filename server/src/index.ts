import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, getDb } from './db/database';
import { AuthService } from './auth/authService';
import { gcsProvider } from './cloud/gcsProvider';
import { azureProvider } from './cloud/azureProvider';
import { calculateStorageEmissions, Region, CloudProvider } from './carbon/carbonEngine';

dotenv.config();

// Initialize SQLite database and seed initial dataset if not present
initDb();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Health Check ---
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Cinematic Asset Carbon Profiler (CACP) API',
  });
});

// --- Auth Endpoints ---
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.login(email, password);
    if (!result) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const result = await AuthService.register(email, password, name);
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { email, name, avatar } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Google email and name are required' });
    }

    const result = await AuthService.googleOAuthLogin({ email, name, avatar });
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Google OAuth failed' });
  }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const user = AuthService.verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  return res.json({ user });
});

// --- Cloud Provider Integration Endpoints ---
app.get('/api/cloud/verify', async (req: Request, res: Response) => {
  const provider = (req.query.provider as string)?.toLowerCase();
  try {
    if (provider === 'azure') {
      const status = await azureProvider.verifyConnection();
      return res.json(status);
    } else {
      const status = await gcsProvider.verifyConnection();
      return res.json(status);
    }
  } catch (err: any) {
    return res.status(500).json({ connected: false, message: err.message });
  }
});

app.get('/api/cloud/containers', async (req: Request, res: Response) => {
  const provider = (req.query.provider as string)?.toLowerCase();
  try {
    if (provider === 'azure') {
      const containers = await azureProvider.getContainers();
      return res.json({ provider: 'azure', items: containers });
    } else {
      const buckets = await gcsProvider.getBuckets();
      return res.json({ provider: 'gcs', items: buckets });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/cloud/connect', async (req: Request, res: Response) => {
  const { provider = 'gcs', bucketName } = req.body;
  const db = getDb();

  try {
    const isAzure = provider === 'azure';
    const verification = isAzure
      ? await azureProvider.verifyConnection()
      : await gcsProvider.verifyConnection();

    // Upsert cloud config
    const targetBucket = bucketName || (isAzure ? 'cacp-azure-hot-tier' : 'cacp-production-assets');
    const existing = db.prepare('SELECT id FROM cloud_configs WHERE provider = ?').all(provider);

    if (existing.length === 0) {
      db.prepare(`
        INSERT INTO cloud_configs (id, user_id, provider, bucket_name, region, is_connected, last_synced_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(`cfg_${Date.now()}`, 'user_demo_1', provider, targetBucket, 'US', new Date().toISOString());
    } else {
      db.prepare(`
        UPDATE cloud_configs SET is_connected = 1, bucket_name = ?, last_synced_at = ? WHERE provider = ?
      `).run(targetBucket, new Date().toISOString(), provider);
    }

    return res.json({
      success: true,
      provider,
      bucket: targetBucket,
      verification,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Asset Inventory Endpoints ---
app.get('/api/files', (req: Request, res: Response) => {
  const db = getDb();
  const region = (req.query.region as Region) || 'US';
  const provider = (req.query.provider as CloudProvider) || 'gcs';
  const assetType = req.query.assetType as string;
  const action = req.query.action as string;
  const search = req.query.search as string;
  const isDuplicate = req.query.isDuplicate;
  const flaggedOnly = req.query.flaggedOnly === 'true';

  let query = 'SELECT * FROM files WHERE 1=1';
  const params: any[] = [];

  if (assetType && assetType !== 'All') {
    query += ' AND asset_type = ?';
    params.push(assetType);
  }

  if (action && action !== 'All') {
    query += ' AND recommended_action = ?';
    params.push(action);
  }

  if (search) {
    query += ' AND (filename LIKE ? OR path LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (isDuplicate !== undefined && isDuplicate !== '') {
    query += ' AND is_duplicate = ?';
    params.push(isDuplicate === 'true' || isDuplicate === '1' ? 1 : 0);
  }

  if (flaggedOnly) {
    query += ' AND flagged_for_review = 1';
  }

  query += ' ORDER BY size_bytes DESC';

  const rows = db.prepare(query).all(...params) as any[];

  // Recalculate carbon and costs dynamically based on currently selected region & provider
  const files = rows.map(r => {
    const calc = calculateStorageEmissions({
      sizeGB: r.size_gb,
      region,
      provider,
    });

    return {
      id: r.id,
      filename: r.filename,
      path: r.path,
      extension: r.extension,
      sizeBytes: r.size_bytes,
      sizeGB: r.size_gb,
      createdAt: r.created_at,
      ageMonths: r.age_months,
      assetType: r.asset_type,
      recommendedAction: r.recommended_action,
      monthlyCost: calc.monthlyCostUSD,
      annualCarbonKg: calc.annualCarbonKg,
      isDuplicate: Boolean(r.is_duplicate),
      baseFilename: r.base_filename || undefined,
      flaggedForReview: Boolean(r.flagged_for_review),
      uvgSequenceName: r.uvg_sequence_name || undefined,
      uvgMotion: r.uvg_motion || undefined,
      uvgTexture: r.uvg_texture || undefined,
      uvgContrast: r.uvg_contrast || undefined,
      uvgFps: r.uvg_fps || undefined,
      uvgFrames: r.uvg_frames || undefined,
      uvgResolution: r.uvg_resolution || undefined,
    };
  });

  res.json({
    total: files.length,
    region,
    provider,
    files,
  });
});

app.post('/api/files/:id/flag', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const file = db.prepare('SELECT flagged_for_review FROM files WHERE id = ?').all(id) as any[];
  if (file.length === 0) {
    return res.status(404).json({ error: 'File not found' });
  }

  const currentFlag = file[0].flagged_for_review;
  const newFlag = currentFlag ? 0 : 1;

  db.prepare('UPDATE files SET flagged_for_review = ? WHERE id = ?').run(newFlag, id);
  return res.json({ id, flaggedForReview: Boolean(newFlag) });
});

app.post('/api/files/bulk-flag', (req: Request, res: Response) => {
  const { fileIds, flagged = true } = req.body;
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'fileIds array is required' });
  }

  const db = getDb();
  const flagValue = flagged ? 1 : 0;
  const stmt = db.prepare('UPDATE files SET flagged_for_review = ? WHERE id = ?');

  for (const id of fileIds) {
    stmt.run(flagValue, id);
  }

  return res.json({ updatedCount: fileIds.length, flagged: Boolean(flagged) });
});

// --- Carbon Engine & Calculations ---
app.post('/api/carbon/calculate', (req: Request, res: Response) => {
  try {
    const {
      sizeGB = 0,
      months = 12,
      region = 'US',
      provider = 'gcs',
      tier,
      monthlyEgressGB = 0,
      includeEmbodied = true,
    } = req.body;

    const result = calculateStorageEmissions({
      sizeGB: Number(sizeGB),
      months: Number(months),
      region: region as Region,
      provider: provider as CloudProvider,
      tier,
      monthlyEgressGB: Number(monthlyEgressGB),
      includeEmbodied: Boolean(includeEmbodied),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.get('/api/carbon/summary', (req: Request, res: Response) => {
  const db = getDb();
  const region = (req.query.region as Region) || 'US';
  const provider = (req.query.provider as CloudProvider) || 'gcs';

  const rows = db.prepare('SELECT size_gb, recommended_action FROM files').all() as any[];

  let totalStorageGB = 0;
  let totalFileCount = rows.length;
  let estimatedMonthlyCost = 0;
  let estimatedAnnualCarbonKg = 0;
  let potentialMonthlySavings = 0;
  let potentialCarbonSavingsKg = 0;

  for (const r of rows) {
    totalStorageGB += r.size_gb;
    const calc = calculateStorageEmissions({ sizeGB: r.size_gb, region, provider });
    estimatedMonthlyCost += calc.monthlyCostUSD;
    estimatedAnnualCarbonKg += calc.annualCarbonKg;

    if (r.recommended_action !== 'Keep') {
      potentialMonthlySavings += calc.monthlyCostUSD;
      potentialCarbonSavingsKg += calc.annualCarbonKg;
    }
  }

  return res.json({
    region,
    provider,
    totalStorageGB: Number(totalStorageGB.toFixed(2)),
    totalFileCount,
    estimatedMonthlyCost: Number(estimatedMonthlyCost.toFixed(2)),
    estimatedAnnualCarbonKg: Number(estimatedAnnualCarbonKg.toFixed(2)),
    potentialMonthlySavings: Number(potentialMonthlySavings.toFixed(2)),
    potentialCarbonSavingsKg: Number(potentialCarbonSavingsKg.toFixed(2)),
  });
});

app.get('/api/carbon/historical', (req: Request, res: Response) => {
  const db = getDb();
  const region = (req.query.region as Region) || 'US';
  const provider = (req.query.provider as CloudProvider) || 'gcs';

  const rows = db.prepare('SELECT month, storage_gb, file_count FROM historical_snapshots').all() as any[];

  const historicalData = rows.map(r => {
    const calc = calculateStorageEmissions({ sizeGB: r.storage_gb, region, provider });
    return {
      month: r.month,
      storageGB: r.storage_gb,
      fileCount: r.file_count,
      cost: calc.monthlyCostUSD,
      carbonKg: calc.annualCarbonKg,
    };
  });

  return res.json(historicalData);
});

// --- UVG 4K Dataset Endpoint ---
app.get('/api/dataset/uvg', (_req: Request, res: Response) => {
  const db = getDb();
  const records = db.prepare('SELECT * FROM uvg_dataset').all();
  return res.json({
    datasetName: 'UVG 4K Video Dataset',
    officialUrl: 'https://tie-ultravideo.rd.tuni.fi/dataset.html',
    totalSequences: records.length,
    records,
  });
});

app.listen(PORT, () => {
  console.log(`[CACP API] Server running at http://localhost:${PORT}`);
  console.log(`[CACP API] Health endpoint at http://localhost:${PORT}/api/health`);
});
