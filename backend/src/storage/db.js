import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { supabase } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_DB_PATH = path.resolve(DATA_DIR, 'ledgerlens_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial local schema state
const initialData = {
  users: [],
  documents: [],
  extracted_data: [],
  line_items: [],
  validation_issues: [],
  document_matches: [],
  document_reviews: [],
  processing_jobs: [],
  refresh_tokens: [],
};

// Safe JSON DB reader/writer
function readLocalDB() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local DB, initializing default:', err);
    return initialData;
  }
}

function writeLocalDB(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local DB:', err);
  }
}

let warnedMissingTables = false;
function isTableMissingError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const isMissing =
    error.code === 'PGRST205' ||
    error.code === 'PGRST204' ||
    error.code === '42P01' ||
    msg.includes('schema cache') ||
    (msg.includes('relation') && msg.includes('does not exist'));

  if (isMissing && !warnedMissingTables) {
    console.warn(
      '\n⚠️  [Supabase Schema Notice]: Tables not yet created in your Supabase project.' +
      '\n👉 Please copy and run "backend/migrations/001_initial_schema.sql" in the Supabase SQL Editor.' +
      '\n🛡️  Falling back gracefully to local persistent storage in the meantime.\n'
    );
    warnedMissingTables = true;
  }
  return isMissing;
}

export const db = {
  isSupabase: () => config.supabase.isConfigured && supabase !== null,

  // ================= USERS =================
  users: {
    async findByEmail(email) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).single();
          if (error) {
            if (error.code === 'PGRST116') return null; // No rows found
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || null;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const data = readLocalDB();
      return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
    },

    async findById(id) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
          if (error) {
            if (error.code === 'PGRST116') return null;
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || null;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const data = readLocalDB();
      return data.users.find((u) => u.id === id) || null;
    },

    async create({ full_name, email, password_hash }) {
      const now = new Date().toISOString();
      const newUser = {
        id: uuidv4(),
        full_name,
        email: email.toLowerCase(),
        password_hash,
        created_at: now,
        updated_at: now,
      };

      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('users').insert([newUser]).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }

      const store = readLocalDB();
      store.users.push(newUser);
      writeLocalDB(store);
      return newUser;
    },

    async update(id, updates) {
      const now = new Date().toISOString();
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('users').update({ ...updates, updated_at: now }).eq('id', id).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      const idx = store.users.findIndex((u) => u.id === id);
      if (idx === -1) return null;
      store.users[idx] = { ...store.users[idx], ...updates, updated_at: now };
      writeLocalDB(store);
      return store.users[idx];
    },
  },

  // ================= DOCUMENTS =================
  documents: {
    async create(docData) {
      const now = new Date().toISOString();
      const newDoc = {
        id: uuidv4(),
        uploaded_at: now,
        processing_status: 'Uploaded',
        validation_status: 'Pending',
        document_type: 'Other',
        ...docData,
      };

      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('documents').insert([newDoc]).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }

      const store = readLocalDB();
      store.documents.push(newDoc);
      writeLocalDB(store);
      return newDoc;
    },

    async findById(id, userId) {
      if (db.isSupabase()) {
        try {
          let query = supabase.from('documents').select('*').eq('id', id);
          if (userId) query = query.eq('user_id', userId);
          const { data, error } = await query.single();
          if (error) {
            if (error.code === 'PGRST116') return null;
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || null;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      const doc = store.documents.find((d) => d.id === id && (!userId || d.user_id === userId));
      return doc || null;
    },

    async findByUserId(userId, options = {}) {
      const { category, status, search, sortBy = 'uploaded_at', sortOrder = 'desc', limit = 50, offset = 0 } = options;

      if (db.isSupabase()) {
        try {
          let query = supabase.from('documents').select('*', { count: 'exact' }).eq('user_id', userId);
          if (category && category !== 'All') query = query.eq('document_type', category);
          if (status && status !== 'All') query = query.eq('processing_status', status);
          if (search) query = query.ilike('original_filename', `%${search}%`);
          query = query.order(sortBy, { ascending: sortOrder === 'asc' });
          query = query.range(offset, offset + limit - 1);

          const { data, count, error } = await query;
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return { documents: data || [], total: count || 0 };
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }

      const store = readLocalDB();
      let docs = store.documents.filter((d) => d.user_id === userId);

      if (category && category !== 'All') {
        docs = docs.filter((d) => d.document_type?.toLowerCase() === category.toLowerCase());
      }
      if (status && status !== 'All') {
        docs = docs.filter((d) => d.processing_status?.toLowerCase() === status.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        docs = docs.filter((d) => d.original_filename?.toLowerCase().includes(q));
      }

      docs.sort((a, b) => {
        const valA = a[sortBy] || '';
        const valB = b[sortBy] || '';
        if (sortOrder === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });

      const total = docs.length;
      const paginated = docs.slice(offset, offset + limit);

      return { documents: paginated, total };
    },

    async update(id, updates) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('documents').update(updates).eq('id', id).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      const idx = store.documents.findIndex((d) => d.id === id);
      if (idx === -1) return null;
      store.documents[idx] = { ...store.documents[idx], ...updates };
      writeLocalDB(store);
      return store.documents[idx];
    },

    async delete(id, userId) {
      if (db.isSupabase()) {
        try {
          const { error } = await supabase.from('documents').delete().eq('id', id).eq('user_id', userId);
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return true;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      store.documents = store.documents.filter((d) => !(d.id === id && d.user_id === userId));
      const extIds = store.extracted_data.filter((e) => e.document_id === id).map((e) => e.id);
      store.extracted_data = store.extracted_data.filter((e) => e.document_id !== id);
      store.line_items = store.line_items.filter((l) => !extIds.includes(l.extracted_data_id));
      store.validation_issues = store.validation_issues.filter((v) => v.document_id !== id);
      store.document_matches = store.document_matches.filter((m) => m.invoice_document_id !== id && m.purchase_order_document_id !== id);
      store.document_reviews = store.document_reviews.filter((r) => r.document_id !== id);
      store.processing_jobs = store.processing_jobs.filter((p) => p.document_id !== id);
      writeLocalDB(store);
      return true;
    },
  },

  // ================= EXTRACTED DATA =================
  extractedData: {
    async create(data) {
      const now = new Date().toISOString();
      const newExt = {
        id: uuidv4(),
        created_at: now,
        updated_at: now,
        ...data,
      };

      if (db.isSupabase()) {
        try {
          const { data: res, error } = await supabase.from('extracted_data').insert([newExt]).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return res;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      store.extracted_data = store.extracted_data.filter((e) => e.document_id !== data.document_id);
      store.extracted_data.push(newExt);
      writeLocalDB(store);
      return newExt;
    },

    async findByDocumentId(documentId) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('extracted_data').select('*').eq('document_id', documentId).single();
          if (error) {
            if (error.code === 'PGRST116') return null;
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || null;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      return store.extracted_data.find((e) => e.document_id === documentId) || null;
    },

    async update(id, updates) {
      const now = new Date().toISOString();
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('extracted_data').update({ ...updates, updated_at: now }).eq('id', id).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      const idx = store.extracted_data.findIndex((e) => e.id === id);
      if (idx === -1) return null;
      store.extracted_data[idx] = { ...store.extracted_data[idx], ...updates, updated_at: now };
      writeLocalDB(store);
      return store.extracted_data[idx];
    },
  },

  // ================= LINE ITEMS =================
  lineItems: {
    async createMany(items) {
      const now = new Date().toISOString();
      const enriched = items.map((item) => ({
        id: uuidv4(),
        created_at: now,
        ...item,
      }));

      if (enriched.length === 0) return [];

      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('line_items').insert(enriched).select();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      store.line_items.push(...enriched);
      writeLocalDB(store);
      return enriched;
    },

    async findByExtractedDataId(extractedDataId) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('line_items').select('*').eq('extracted_data_id', extractedDataId);
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || [];
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      return store.line_items.filter((l) => l.extracted_data_id === extractedDataId);
    },

    async deleteByExtractedDataId(extractedDataId) {
      if (db.isSupabase()) {
        try {
          const { error } = await supabase.from('line_items').delete().eq('extracted_data_id', extractedDataId);
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return true;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      store.line_items = store.line_items.filter((l) => l.extracted_data_id !== extractedDataId);
      writeLocalDB(store);
      return true;
    },
  },

  // ================= VALIDATION ISSUES =================
  validationIssues: {
    async createMany(issues) {
      const now = new Date().toISOString();
      const enriched = issues.map((i) => ({
        id: uuidv4(),
        status: 'Open',
        created_at: now,
        ...i,
      }));

      if (enriched.length === 0) return [];

      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('validation_issues').insert(enriched).select();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      store.validation_issues.push(...enriched);
      writeLocalDB(store);
      return enriched;
    },

    async findByDocumentId(documentId) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('validation_issues').select('*').eq('document_id', documentId);
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || [];
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      return store.validation_issues.filter((v) => v.document_id === documentId);
    },

    async findByUserId(userId, options = {}) {
      const { status, severity } = options;
      if (db.isSupabase()) {
        try {
          let query = supabase.from('validation_issues').select('*, documents(original_filename, document_type)').eq('user_id', userId);
          if (status) query = query.eq('status', status);
          if (severity) query = query.eq('severity', severity);
          const { data, error } = await query;
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || [];
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      let issues = store.validation_issues.filter((v) => v.user_id === userId);
      if (status && status !== 'All') issues = issues.filter((v) => v.status === status);
      if (severity && severity !== 'All') issues = issues.filter((v) => v.severity === severity);

      return issues.map((i) => {
        const doc = store.documents.find((d) => d.id === i.document_id);
        return {
          ...i,
          document_name: doc?.original_filename || 'Unknown Document',
          document_type: doc?.document_type || 'Unknown',
        };
      });
    },

    async updateStatus(id, status) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('validation_issues').update({ status }).eq('id', id).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      const idx = store.validation_issues.findIndex((v) => v.id === id);
      if (idx === -1) return null;
      store.validation_issues[idx].status = status;
      writeLocalDB(store);
      return store.validation_issues[idx];
    },

    async deleteByDocumentId(documentId) {
      if (db.isSupabase()) {
        try {
          const { error } = await supabase.from('validation_issues').delete().eq('document_id', documentId);
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return true;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      store.validation_issues = store.validation_issues.filter((v) => v.document_id !== documentId);
      writeLocalDB(store);
      return true;
    },
  },

  // ================= DOCUMENT MATCHES (CROSS-DOCUMENT) =================
  documentMatches: {
    async create(matchData) {
      const now = new Date().toISOString();
      const match = {
        id: uuidv4(),
        created_at: now,
        ...matchData,
      };

      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('document_matches').insert([match]).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      store.document_matches.push(match);
      writeLocalDB(store);
      return match;
    },

    async findByUserId(userId) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('document_matches').select('*').eq('user_id', userId).order('created_at', { ascending: false });
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || [];
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      return store.document_matches.filter((m) => m.user_id === userId).reverse();
    },

    async findById(id, userId) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('document_matches').select('*').eq('id', id).eq('user_id', userId).single();
          if (error) {
            if (error.code === 'PGRST116') return null;
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || null;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      return store.document_matches.find((m) => m.id === id && m.user_id === userId) || null;
    },
  },

  // ================= DOCUMENT REVIEWS =================
  documentReviews: {
    async create(reviewData) {
      const now = new Date().toISOString();
      const review = {
        id: uuidv4(),
        created_at: now,
        ...reviewData,
      };

      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('document_reviews').insert([review]).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      store.document_reviews.push(review);
      writeLocalDB(store);
      return review;
    },

    async findByDocumentId(documentId) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('document_reviews').select('*').eq('document_id', documentId).order('created_at', { ascending: false });
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || [];
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      return store.document_reviews.filter((r) => r.document_id === documentId).reverse();
    },
  },

  // ================= REFRESH TOKENS =================
  refreshTokens: {
    async create(tokenData) {
      const now = new Date().toISOString();
      const token = {
        id: uuidv4(),
        created_at: now,
        ...tokenData,
      };

      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('refresh_tokens').insert([token]).select().single();
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      store.refresh_tokens.push(token);
      writeLocalDB(store);
      return token;
    },

    async findByTokenHash(tokenHash) {
      if (db.isSupabase()) {
        try {
          const { data, error } = await supabase.from('refresh_tokens').select('*').eq('token_hash', tokenHash).is('revoked_at', null).single();
          if (error) {
            if (error.code === 'PGRST116') return null;
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return data || null;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      return store.refresh_tokens.find((t) => t.token_hash === tokenHash && !t.revoked_at) || null;
    },

    async revoke(tokenHash) {
      const now = new Date().toISOString();
      if (db.isSupabase()) {
        try {
          const { error } = await supabase.from('refresh_tokens').update({ revoked_at: now }).eq('token_hash', tokenHash);
          if (error) {
            if (isTableMissingError(error)) throw error;
            throw error;
          }
          return true;
        } catch (err) {
          if (!isTableMissingError(err)) throw err;
        }
      }
      const store = readLocalDB();
      const token = store.refresh_tokens.find((t) => t.token_hash === tokenHash);
      if (token) token.revoked_at = now;
      writeLocalDB(store);
      return true;
    },
  },
};
