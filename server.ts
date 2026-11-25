import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_GRADE_CATEGORIES,
  DEMO_ACCOUNTS,
  INITIAL_JOURNAL_DATA,
} from './src/data/initialJournalData.ts';
import { formatPolishDateTime } from './src/utils/grades.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoreMeta {
  revision: number;
  updatedAt: number;
  resetToken: number;
  count?: number;
}

async function startServer() {
  const app = express();
  // AI Studio requires the app to listen on port 3000
  const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Enable CORS & request parsing
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  // Support navigator.sendBeacon which sends text/plain to avoid preflight
  app.use(
    express.text({ type: 'text/plain', limit: '25mb' }),
    (req, _res, next) => {
      if (typeof req.body === 'string' && req.body.trim().startsWith('{') || (typeof req.body === 'string' && req.body.trim().startsWith('['))) {
        try {
          req.body = JSON.parse(req.body);
        } catch {
          // leave as string
        }
      }
      next();
    }
  );

  const dataDir = path.resolve(__dirname, 'data');
  const backupDir = path.join(os.tmpdir(), 'edziennik-synergia-backup');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const accountsFilePath = path.join(dataDir, 'accounts.json');
  const accountsMetaPath = path.join(dataDir, 'accounts.meta.json');
  const journalFilePath = path.join(dataDir, 'journal.json');

  const backupAccountsFilePath = path.join(backupDir, 'accounts.json');
  const backupAccountsMetaPath = path.join(backupDir, 'accounts.meta.json');
  const backupJournalFilePath = path.join(backupDir, 'journal.json');

  const sseClients = new Set<express.Response>();
  let stateVersion = Date.now();

  const broadcastStateChange = (scope: 'accounts' | 'journal' | 'all') => {
    stateVersion = Date.now();
    const payload = `data: ${JSON.stringify({ scope, version: stateVersion })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  const writeRawAtomic = (filePath: string, data: unknown) => {
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  };

  const readJsonSafe = <T = any>(filePath: string): T | null => {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
      }
    } catch {
      // ignore corrupted/missing json
    }
    return null;
  };

  const normalizeAccountsMeta = (raw: any, accountsList?: any[]): StoreMeta => {
    const rev = Number(raw?.revision ?? 0);
    const upd = Number(raw?.updatedAt ?? 0);
    const rst = Number(raw?.resetToken ?? 0);
    const cnt =
      raw?.count !== undefined
        ? Number(raw.count)
        : Array.isArray(accountsList)
          ? accountsList.length
          : undefined;
    if (rev > 0 || upd > 0) {
      return {
        revision: Math.max(1, rev),
        updatedAt: upd || Date.now(),
        resetToken: rst,
        count: cnt,
      };
    }
    const inferredModified = Array.isArray(accountsList) && accountsList.length > 1;
    return {
      revision: inferredModified ? 1 : 0,
      updatedAt: inferredModified ? Date.now() : 0,
      resetToken: rst,
      count: cnt,
    };
  };

  const readAccountsMeta = (): StoreMeta => {
    const primaryAccounts = readJsonSafe<any[]>(accountsFilePath);
    const primaryMeta = normalizeAccountsMeta(readJsonSafe(accountsMetaPath), primaryAccounts ?? undefined);
    const backupAccounts = readJsonSafe<any[]>(backupAccountsFilePath);
    const backupMeta = normalizeAccountsMeta(
      readJsonSafe(backupAccountsMetaPath),
      backupAccounts ?? undefined
    );
    if (
      (backupMeta.revision > primaryMeta.revision && backupMeta.updatedAt >= primaryMeta.updatedAt) ||
      (Array.isArray(backupAccounts) &&
        Array.isArray(primaryAccounts) &&
        backupMeta.revision >= primaryMeta.revision &&
        backupMeta.resetToken >= primaryMeta.resetToken &&
        backupAccounts.length > primaryAccounts.length)
    ) {
      return backupMeta;
    }
    return primaryMeta;
  };

  const readAccounts = () => {
    const primary = readJsonSafe<any[]>(accountsFilePath);
    const primaryMeta = normalizeAccountsMeta(readJsonSafe(accountsMetaPath), primary ?? undefined);
    const backup = readJsonSafe<any[]>(backupAccountsFilePath);
    const backupMeta = normalizeAccountsMeta(readJsonSafe(backupAccountsMetaPath), backup ?? undefined);

    const backupIsFresherOrRecovered =
      Array.isArray(backup) &&
      backup.length > 0 &&
      (backupMeta.revision > primaryMeta.revision ||
        (primaryMeta.revision === 0 && backup.length > (primary?.length ?? 0)) ||
        (backupMeta.revision >= primaryMeta.revision &&
          backupMeta.resetToken >= primaryMeta.resetToken &&
          backup.length > (primary?.length ?? 0)));

    // If workspace sync reset data/accounts.json while /tmp backup has user edits, restore!
    if (backupIsFresherOrRecovered) {
      try {
        writeRawAtomic(accountsFilePath, backup);
        writeRawAtomic(accountsMetaPath, { ...backupMeta, count: backup.length });
      } catch {
        // ignore restore write errors
      }
      return backup;
    }

    if (Array.isArray(primary) && primary.length > 0) {
      return primary;
    }
    if (Array.isArray(backup) && backup.length > 0) {
      return backup;
    }
    return DEMO_ACCOUNTS;
  };

  const normalizeJournal = (parsed: any) => ({
    ...INITIAL_JOURNAL_DATA,
    ...parsed,
    gradeCategories:
      Array.isArray(parsed.gradeCategories) && parsed.gradeCategories.length > 0
        ? parsed.gradeCategories
        : DEFAULT_GRADE_CATEGORIES,
    readyTopics: Array.isArray(parsed.readyTopics) ? parsed.readyTopics : [],
    classRooms: Array.isArray(parsed.classRooms)
      ? Array.from(new Set(parsed.classRooms.map((r: any) => String(r ?? '').trim()).filter(Boolean)))
      : [],
    classLessonHours:
      parsed.classLessonHours && typeof parsed.classLessonHours === 'object'
        ? parsed.classLessonHours
        : {},
    cancelledDays: Array.isArray(parsed.cancelledDays) ? parsed.cancelledDays : [],
    temporaryTransfers: Array.isArray(parsed.temporaryTransfers)
      ? parsed.temporaryTransfers
      : [],
    maintenance: {
      ...(INITIAL_JOURNAL_DATA.maintenance ?? {
        enabled: false,
        from: '',
        to: '',
        message: 'Ze względu na nowe udostępnienie',
        blockNonDirector: false,
      }),
      ...(parsed.maintenance ?? {}),
    },
    _revision: Number(parsed._revision ?? 0),
    _updatedAt: Number(parsed._updatedAt ?? 0),
    _resetToken: Number(parsed._resetToken ?? 0),
  });

  const readJournal = () => {
    const primary = readJsonSafe<any>(journalFilePath);
    const backup = readJsonSafe<any>(backupJournalFilePath);

    const primaryRev = Number(primary?._revision ?? 0);
    const primaryUpd = Number(primary?._updatedAt ?? 0);
    const backupRev = Number(backup?._revision ?? 0);
    const backupUpd = Number(backup?._updatedAt ?? 0);

    // If workspace sync reset data/journal.json while /tmp backup has user edits, restore!
    if (
      backup &&
      typeof backup === 'object' &&
      Array.isArray(backup.classes) &&
      (backupRev > primaryRev || (primaryRev === 0 && backupUpd > primaryUpd))
    ) {
      const normalized = normalizeJournal(backup);
      try {
        writeRawAtomic(journalFilePath, normalized);
      } catch {
        // ignore restore write errors
      }
      return normalized;
    }

    if (primary && typeof primary === 'object') {
      return normalizeJournal(primary);
    }
    if (backup && typeof backup === 'object') {
      return normalizeJournal(backup);
    }
    return { ...INITIAL_JOURNAL_DATA, _revision: 0, _updatedAt: 0, _resetToken: 0 };
  };

  const writeAccountsState = (accounts: any[], metaOverride?: Partial<StoreMeta>) => {
    const prevMeta = readAccountsMeta();
    const nextMeta: StoreMeta = {
      revision: metaOverride?.revision ?? prevMeta.revision + 1,
      updatedAt: metaOverride?.updatedAt ?? Date.now(),
      resetToken: metaOverride?.resetToken ?? prevMeta.resetToken,
      count: accounts.length,
    };
    writeRawAtomic(accountsFilePath, accounts);
    writeRawAtomic(accountsMetaPath, nextMeta);
    try {
      writeRawAtomic(backupAccountsFilePath, accounts);
      writeRawAtomic(backupAccountsMetaPath, nextMeta);
    } catch {
      // ignore backup write failures
    }
    broadcastStateChange('accounts');
    return nextMeta;
  };

  const writeJournalState = (journal: any, metaOverride?: { revision?: number; updatedAt?: number; resetToken?: number }) => {
    const current = readJournal();
    const nextJournal = normalizeJournal({
      ...journal,
      _revision: metaOverride?.revision ?? Number(current._revision ?? 0) + 1,
      _updatedAt: metaOverride?.updatedAt ?? Date.now(),
      _resetToken: metaOverride?.resetToken ?? Number(current._resetToken ?? 0),
    });
    writeRawAtomic(journalFilePath, nextJournal);
    try {
      writeRawAtomic(backupJournalFilePath, nextJournal);
    } catch {
      // ignore backup write failures
    }
    broadcastStateChange('journal');
    return nextJournal;
  };

  const writeJsonAtomic = (filePath: string, data: unknown) => {
    if (filePath === accountsFilePath) {
      writeAccountsState(Array.isArray(data) ? data : DEMO_ACCOUNTS);
    } else if (filePath === journalFilePath) {
      writeJournalState(data);
    } else {
      writeRawAtomic(filePath, data);
    }
  };

  // Initialize data files if not present (revision 0 = untouched factory seed)
  if (!fs.existsSync(accountsFilePath)) {
    const initialMeta: StoreMeta = { revision: 0, updatedAt: 0, resetToken: 0 };
    writeRawAtomic(accountsFilePath, DEMO_ACCOUNTS);
    writeRawAtomic(accountsMetaPath, initialMeta);
  }
  if (!fs.existsSync(journalFilePath)) {
    writeRawAtomic(journalFilePath, {
      ...INITIAL_JOURNAL_DATA,
      _revision: 0,
      _updatedAt: 0,
      _resetToken: 0,
    });
  }
  // Trigger initial backup sync/restore check
  readAccounts();
  readJournal();

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // Real-time Server-Sent Events stream for instant cross-user sync
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ scope: 'connected', version: stateVersion })}\n\n`);
    sseClients.add(res);
    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);
    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Combined state endpoint for continuous cross-user sync
  app.get('/api/state', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const accounts = readAccounts();
    const accountsMeta = readAccountsMeta();
    const journal = readJournal();
    res.json({
      version: stateVersion,
      accounts,
      accountsMeta,
      journal,
      journalMeta: {
        revision: Number(journal._revision ?? 0),
        updatedAt: Number(journal._updatedAt ?? 0),
        resetToken: Number(journal._resetToken ?? 0),
      },
    });
  });

  // Maintenance break endpoints (readable before login)
  app.get('/api/maintenance', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const journal = readJournal();
    res.json(
      journal.maintenance ?? {
        enabled: false,
        from: '',
        to: '',
        message: 'Ze względu na nowe udostępnienie',
        blockNonDirector: false,
      }
    );
  });

  app.post('/api/maintenance', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Nieprawidłowe dane przerwy technicznej' });
      }
      const journal = readJournal();
      const nextMaintenance = {
        enabled: Boolean(payload.enabled),
        from: String(payload.from ?? '').trim(),
        to: String(payload.to ?? '').trim(),
        message: String(payload.message ?? 'Ze względu na nowe udostępnienie').trim(),
        blockNonDirector: Boolean(payload.blockNonDirector),
        updatedBy: payload.updatedBy ? String(payload.updatedBy) : 'Dyrektor',
        updatedAt: formatPolishDateTime(new Date()),
      };
      const updatedJournal = writeJournalState({
        ...journal,
        maintenance: nextMaintenance,
      });
      return res.json({ success: true, maintenance: nextMaintenance, journal: updatedJournal });
    } catch (err) {
      console.error('Error saving maintenance:', err);
      return res.status(500).json({ error: 'Nie udało się zapisać przerwy technicznej' });
    }
  });

  // API Endpoints
  app.get('/api/accounts', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(readAccounts());
  });

  // Bulk save accounts (non-destructive merge upsert unless replaceAll=true, so stale clients never wipe created accounts)
  app.post('/api/accounts', (req, res) => {
    try {
      const rawBody = req.body;
      const incomingAccounts = Array.isArray(rawBody) ? rawBody : rawBody?.accounts;
      const clientMeta = !Array.isArray(rawBody) ? rawBody?.meta : undefined;
      const replaceAll = !Array.isArray(rawBody) && rawBody?.replaceAll === true;
      if (Array.isArray(incomingAccounts) && incomingAccounts.length > 0) {
        const currentMeta = readAccountsMeta();
        const existingAccounts = readAccounts();
        let finalAccounts: any[];
        if (replaceAll) {
          finalAccounts = incomingAccounts;
        } else {
          finalAccounts = [...existingAccounts];
          for (const inc of incomingAccounts) {
            const cleanLogin = String(inc?.login ?? '').trim();
            if (!inc || !cleanLogin) continue;
            const matchIdx = finalAccounts.findIndex(
              (a: any) =>
                (inc.id && a.id === inc.id) ||
                String(a.login ?? '').trim().toLowerCase() === cleanLogin.toLowerCase()
            );
            if (matchIdx >= 0) {
              const prevAcc = finalAccounts[matchIdx];
              finalAccounts[matchIdx] = {
                ...prevAcc,
                ...inc,
                id: prevAcc.id || inc.id,
                login: cleanLogin,
                fullName: String(inc.fullName ?? prevAcc.fullName ?? cleanLogin).trim() || cleanLogin,
                lastLoginAt: inc.lastLoginAt || prevAcc.lastLoginAt,
                previousLoginAt: inc.previousLoginAt || prevAcc.previousLoginAt,
              };
            } else {
              finalAccounts.push({
                ...inc,
                id: inc.id || `acc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                login: cleanLogin,
                fullName: String(inc.fullName ?? cleanLogin).trim() || cleanLogin,
              });
            }
          }
        }
        const nextMeta = writeAccountsState(finalAccounts, {
          revision: Math.max(currentMeta.revision + 1, Number(clientMeta?.revision ?? 0)),
          updatedAt: Math.max(Date.now(), Number(clientMeta?.updatedAt ?? 0)),
        });
        return res.json({
          success: true,
          accounts: finalAccounts,
          accountsMeta: nextMeta,
          count: finalAccounts.length,
        });
      }
      return res.status(400).json({ error: 'Accounts must be a non-empty array' });
    } catch (err) {
      console.error('Error saving accounts:', err);
      return res.status(500).json({ error: 'Failed to save accounts' });
    }
  });

  // Upsert single account (instant sync across all devices)
  app.post('/api/accounts/save', (req, res) => {
    try {
      const incoming = req.body?.account ?? req.body;
      const cleanLogin = String(incoming?.login ?? '').trim();
      if (!incoming || !cleanLogin) {
        return res.status(400).json({ error: 'Nieprawidłowe dane konta' });
      }
      const accounts = readAccounts();
      const existingIdx = accounts.findIndex(
        (a: any) =>
          (incoming.id && a.id === incoming.id) ||
          String(a.login ?? '').trim().toLowerCase() === cleanLogin.toLowerCase()
      );
      const account = {
        ...incoming,
        id:
          (existingIdx >= 0 ? accounts[existingIdx].id : undefined) ||
          incoming.id ||
          `acc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        login: cleanLogin,
        fullName: String(incoming.fullName ?? '').trim() || cleanLogin,
      };
      if (existingIdx >= 0) {
        accounts[existingIdx] = { ...accounts[existingIdx], ...account };
      } else {
        accounts.push(account);
      }
      const accountsMeta = writeAccountsState(accounts);
      return res.json({ success: true, account, accounts, accountsMeta, count: accounts.length });
    } catch (err) {
      console.error('Error saving account:', err);
      return res.status(500).json({ error: 'Failed to save account' });
    }
  });

  // Delete single account
  app.post('/api/accounts/delete', (req, res) => {
    try {
      const { id } = req.body;
      if (!id || id === 'acc-director') {
        return res.status(400).json({ error: 'Nie można usunąć tego konta' });
      }
      const accounts = readAccounts();
      const filtered = accounts.filter((a: any) => a.id !== id);
      const accountsMeta = writeAccountsState(filtered);
      return res.json({ success: true, accounts: filtered, accountsMeta, count: filtered.length });
    } catch (err) {
      console.error('Error deleting account:', err);
      return res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  app.post('/api/login', (req, res) => {
    try {
      const { login, password } = req.body;
      if (!login || !password) {
        return res.status(400).json({ error: 'Brak loginu lub hasła' });
      }
      const accounts = readAccounts();
      const normalized = String(login).trim().toLowerCase();
      const matchedIdx = accounts.findIndex(
        (acc: any) =>
          (acc.login.toLowerCase() === normalized ||
            (acc.email && acc.email.toLowerCase() === normalized)) &&
          acc.password === password
      );
      if (matchedIdx < 0) {
        return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
      }
      const matched = accounts[matchedIdx];
      const journal = readJournal();
      const maint = journal.maintenance;
      if (maint?.enabled && maint.blockNonDirector && matched.role !== 'director') {
        const range = [
          maint.from ? `od ${maint.from}` : '',
          maint.to ? `do ${maint.to}` : '',
        ]
          .filter(Boolean)
          .join(' ');
        return res.status(403).json({
          error: `Przerwa techniczna: ${maint.message || 'Dziennik tymczasowo niedostępny'}${range ? ` (${range})` : ''}. Logowanie dostępne tylko dla Dyrektora.`,
        });
      }

      const nowStr = formatPolishDateTime(new Date());
      const updatedAccount = {
        ...matched,
        previousLoginAt: matched.lastLoginAt || undefined,
        lastLoginAt: nowStr,
      };
      accounts[matchedIdx] = updatedAccount;
      const accountsMeta = writeAccountsState(accounts);

      return res.json({
        success: true,
        account: updatedAccount,
        accounts,
        accountsMeta,
        journal,
      });
    } catch (err) {
      console.error('Error in /api/login:', err);
      return res.status(500).json({ error: 'Błąd serwera podczas logowania' });
    }
  });

  app.get('/api/journal', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(readJournal());
  });

  app.post('/api/journal', (req, res) => {
    try {
      const journal = req.body;
      if (journal && typeof journal === 'object' && Array.isArray(journal.classes)) {
        const current = readJournal();
        const nextJournal = writeJournalState(journal, {
          revision: Math.max(Number(current._revision ?? 0) + 1, Number(journal._revision ?? 0)),
          updatedAt: Math.max(Date.now(), Number(journal._updatedAt ?? 0)),
        });
        return res.json({ success: true, journal: nextJournal });
      }
      return res.status(400).json({ error: 'Journal must be a valid object' });
    } catch (err) {
      console.error('Error saving journal:', err);
      return res.status(500).json({ error: 'Failed to save journal' });
    }
  });

  // Atomic class CRUD endpoints
  app.post('/api/classes/create', (req, res) => {
    try {
      const name = String(req.body?.name ?? '').trim().toUpperCase();
      const homeroomTeacher = String(req.body?.homeroomTeacher ?? 'Wychowawca').trim() || 'Wychowawca';
      if (!name) {
        return res.status(400).json({ error: 'Nazwa klasy jest wymagana' });
      }
      const journal = readJournal();
      const classes = Array.isArray(journal.classes) ? [...journal.classes] : [];
      const exists = classes.some(
        (c: any) => String(c.id).toUpperCase() === name || String(c.name).toUpperCase() === name
      );
      if (!exists) {
        classes.push({
          id: name,
          name,
          homeroomTeacher,
          students: [],
        });
      }
      const nextJournal = writeJournalState({ ...journal, classes });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error creating class:', err);
      return res.status(500).json({ error: 'Nie udało się utworzyć klasy' });
    }
  });

  app.post('/api/classes/update', (req, res) => {
    try {
      const oldClassId = String(req.body?.oldClassId ?? '').trim();
      const trimmedName = String(req.body?.newName ?? '').trim().toUpperCase();
      const trimmedTeacher = String(req.body?.homeroomTeacher ?? '').trim();
      if (!oldClassId || !trimmedName) {
        return res.status(400).json({ error: 'Nieprawidłowe dane klasy' });
      }

      const journal = readJournal();
      const accounts = readAccounts();

      const nextClasses = (journal.classes ?? []).map((cls: any) =>
        cls.id === oldClassId
          ? {
              ...cls,
              id: trimmedName,
              name: trimmedName,
              homeroomTeacher: trimmedTeacher || cls.homeroomTeacher,
            }
          : cls
      );

      const nextSyllabus =
        oldClassId !== trimmedName
          ? (journal.syllabusTopics ?? []).map((t: any) =>
              t.classId === oldClassId ? { ...t, classId: trimmedName } : t
            )
          : journal.syllabusTopics;

      const nextTimetable =
        oldClassId !== trimmedName
          ? (journal.timetable ?? []).map((t: any) =>
              t.classId === oldClassId ? { ...t, classId: trimmedName } : t
            )
          : journal.timetable;

      const nextLessonLogs =
        oldClassId !== trimmedName
          ? (journal.lessonLogs ?? []).map((l: any) =>
              l.classId === oldClassId ? { ...l, classId: trimmedName } : l
            )
          : journal.lessonLogs;

      const nextClassLessonHours = { ...(journal.classLessonHours ?? {}) };
      if (oldClassId !== trimmedName && nextClassLessonHours[oldClassId]) {
        nextClassLessonHours[trimmedName] = nextClassLessonHours[oldClassId];
        delete nextClassLessonHours[oldClassId];
      }

      const nextJournal = {
        ...journal,
        classes: nextClasses,
        classLessonHours: nextClassLessonHours,
        syllabusTopics: nextSyllabus,
        timetable: nextTimetable,
        lessonLogs: nextLessonLogs,
      };
      const savedJournal = writeJournalState(nextJournal);

      let nextAccounts = accounts;
      let accountsMeta = readAccountsMeta();
      if (oldClassId !== trimmedName) {
        nextAccounts = accounts.map((acc: any) =>
          acc.className === oldClassId
            ? {
                ...acc,
                className: trimmedName,
                subtitle: String(acc.subtitle ?? '').replace(
                  `Klasa ${oldClassId}`,
                  `Klasa ${trimmedName}`
                ),
              }
            : acc
        );
        accountsMeta = writeAccountsState(nextAccounts);
      }

      return res.json({ success: true, journal: savedJournal, accounts: nextAccounts, accountsMeta });
    } catch (err) {
      console.error('Error updating class:', err);
      return res.status(500).json({ error: 'Nie udało się zaktualizować klasy' });
    }
  });

  app.post('/api/classes/delete', (req, res) => {
    try {
      const classId = String(req.body?.classId ?? '').trim();
      if (!classId) {
        return res.status(400).json({ error: 'Brak identyfikatora klasy' });
      }
      const journal = readJournal();
      const accounts = readAccounts();

      const remainingClasses = (journal.classes ?? []).filter((c: any) => c.id !== classId);
      const fallbackClass = remainingClasses[0]?.name ?? '';

      const nextClassLessonHours = { ...(journal.classLessonHours ?? {}) };
      delete nextClassLessonHours[classId];

      const savedJournal = writeJournalState({
        ...journal,
        classes: remainingClasses,
        classLessonHours: nextClassLessonHours,
        syllabusTopics: (journal.syllabusTopics ?? []).filter((t: any) => t.classId !== classId),
        timetable: (journal.timetable ?? []).filter((t: any) => t.classId !== classId),
        lessonLogs: (journal.lessonLogs ?? []).filter((l: any) => l.classId !== classId),
      });

      const nextAccounts = accounts.map((acc: any) => {
        if (acc.className === classId) {
          return {
            ...acc,
            className: fallbackClass,
            subtitle: fallbackClass
              ? String(acc.subtitle ?? '').replace(`Klasa ${classId}`, `Klasa ${fallbackClass}`)
              : String(acc.subtitle ?? '').replace(` · Klasa ${classId}`, ''),
          };
        }
        return acc;
      });
      const accountsMeta = writeAccountsState(nextAccounts);

      return res.json({ success: true, journal: savedJournal, accounts: nextAccounts, accountsMeta });
    } catch (err) {
      console.error('Error deleting class:', err);
      return res.status(500).json({ error: 'Nie udało się usunąć klasy' });
    }
  });

  app.post('/api/classes/students/add', (req, res) => {
    try {
      const classId = String(req.body?.classId ?? '').trim();
      const fullName = String(req.body?.fullName ?? '').trim();
      const number = Number(req.body?.number ?? 1);
      if (!classId || !fullName) {
        return res.status(400).json({ error: 'Brak klasy lub danych ucznia' });
      }
      const journal = readJournal();
      const upperTarget = classId.toUpperCase();
      const nextClasses = (journal.classes ?? []).map((cls: any) => {
        if (
          String(cls.id).trim().toUpperCase() !== upperTarget &&
          String(cls.name).trim().toUpperCase() !== upperTarget
        ) {
          return cls;
        }
        const currentStudents = Array.isArray(cls.students) ? [...cls.students] : [];
        const duplicate = currentStudents.some(
          (s: any) =>
            String(s.fullName).trim().toLowerCase() === fullName.toLowerCase() &&
            Number(s.number) === number
        );
        if (!duplicate) {
          currentStudents.push({
            id: req.body?.id || `st-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            number,
            fullName,
          });
        }
        return {
          ...cls,
          students: currentStudents.sort((a: any, b: any) => Number(a.number) - Number(b.number)),
        };
      });
      const savedJournal = writeJournalState({ ...journal, classes: nextClasses });
      return res.json({ success: true, journal: savedJournal });
    } catch (err) {
      console.error('Error adding student to class:', err);
      return res.status(500).json({ error: 'Nie udało się dodać ucznia do klasy' });
    }
  });

  app.post('/api/classes/students/delete', (req, res) => {
    try {
      const classId = String(req.body?.classId ?? '').trim();
      const studentId = String(req.body?.studentId ?? '').trim();
      if (!classId || !studentId) {
        return res.status(400).json({ error: 'Brak identyfikatora klasy lub ucznia' });
      }
      const journal = readJournal();
      const upperTarget = classId.toUpperCase();
      const nextClasses = (journal.classes ?? []).map((cls: any) =>
        String(cls.id).trim().toUpperCase() === upperTarget ||
        String(cls.name).trim().toUpperCase() === upperTarget
          ? {
              ...cls,
              students: (cls.students ?? []).filter((s: any) => s.id !== studentId),
            }
          : cls
      );
      const savedJournal = writeJournalState({ ...journal, classes: nextClasses });
      return res.json({ success: true, journal: savedJournal });
    } catch (err) {
      console.error('Error deleting student from class:', err);
      return res.status(500).json({ error: 'Nie udało się usunąć ucznia z klasy' });
    }
  });

  app.post('/api/classes/students/move', (req, res) => {
    try {
      const fromClassId = String(req.body?.fromClassId ?? '').trim();
      const toClassId = String(req.body?.toClassId ?? '').trim();
      const studentId = String(req.body?.studentId ?? '').trim();
      const requestedNumber = req.body?.targetNumber !== undefined ? Number(req.body.targetNumber) : undefined;

      if (!fromClassId || !toClassId || !studentId) {
        return res.status(400).json({ error: 'Brak klasy źródłowej, docelowej lub ucznia' });
      }
      if (fromClassId === toClassId) {
        return res.status(400).json({ error: 'Klasa źródłowa i docelowa muszą być różne' });
      }

      const journal = readJournal();
      const classes = Array.isArray(journal.classes) ? [...journal.classes] : [];
      const fromClass = classes.find((c: any) => c.id === fromClassId);
      const toClass = classes.find((c: any) => c.id === toClassId);

      if (!fromClass || !toClass) {
        return res.status(404).json({ error: 'Nie znaleziono wskazanej klasy' });
      }

      const sourceStudents = Array.isArray(fromClass.students) ? [...fromClass.students] : [];
      const studentToMove = sourceStudents.find((s: any) => s.id === studentId);
      if (!studentToMove) {
        return res.status(404).json({ error: 'Nie znaleziono ucznia w klasie źródłowej' });
      }

      const targetStudents = Array.isArray(toClass.students) ? [...toClass.students] : [];
      const maxTargetNum = targetStudents.reduce(
        (max: number, s: any) => Math.max(max, Number(s.number) || 0),
        0
      );
      const finalNumber =
        requestedNumber && Number.isFinite(requestedNumber) && requestedNumber >= 1
          ? Math.round(requestedNumber)
          : maxTargetNum + 1;

      const movedStudent = {
        ...studentToMove,
        number: finalNumber,
      };

      const nextClasses = classes.map((cls: any) => {
        if (cls.id === fromClassId) {
          return {
            ...cls,
            students: (cls.students ?? []).filter((s: any) => s.id !== studentId),
          };
        }
        if (cls.id === toClassId) {
          const filtered = (cls.students ?? []).filter(
            (s: any) =>
              s.id !== studentId &&
              String(s.fullName).trim().toLowerCase() !==
                String(studentToMove.fullName).trim().toLowerCase()
          );
          filtered.push(movedStudent);
          return {
            ...cls,
            students: filtered.sort((a: any, b: any) => Number(a.number) - Number(b.number)),
          };
        }
        return cls;
      });

      const savedJournal = writeJournalState({ ...journal, classes: nextClasses });

      // Keep matching student login account synced to the new class and number
      const accounts = readAccounts();
      let accountsChanged = false;
      const movedNameLower = String(studentToMove.fullName).trim().toLowerCase();
      const nextAccounts = accounts.map((acc: any) => {
        if (
          (acc.role === 'student' || acc.role === 'speech_student') &&
          String(acc.fullName ?? '').trim().toLowerCase() === movedNameLower &&
          (acc.className === fromClass.name || acc.className === fromClassId || !acc.className)
        ) {
          accountsChanged = true;
          const roleLabel = acc.role === 'speech_student' ? 'Uczeń logopedyczny' : 'Uczeń';
          return {
            ...acc,
            className: toClass.name,
            studentNumber: finalNumber,
            subtitle: `${roleLabel} · Klasa ${toClass.name} · nr ${finalNumber}`,
          };
        }
        return acc;
      });
      const accountsMeta = accountsChanged ? writeAccountsState(nextAccounts) : readAccountsMeta();

      return res.json({
        success: true,
        journal: savedJournal,
        accounts: nextAccounts,
        accountsMeta,
        movedStudent,
      });
    } catch (err) {
      console.error('Error moving student between classes:', err);
      return res.status(500).json({ error: 'Nie udało się przenieść ucznia do innej klasy' });
    }
  });

  // Atomic subject & grade category endpoints
  app.post('/api/subjects/create', (req, res) => {
    try {
      const name = String(req.body?.name ?? '').trim();
      const teacher = String(req.body?.teacher ?? 'Nauczyciel').trim() || 'Nauczyciel';
      if (!name) {
        return res.status(400).json({ error: 'Nazwa przedmiotu jest wymagana' });
      }
      const journal = readJournal();
      const subjects = Array.isArray(journal.subjects) ? [...journal.subjects] : [];
      const duplicate = subjects.some(
        (s: any) => String(s.name).trim().toLowerCase() === name.toLowerCase()
      );
      if (!duplicate) {
        const slug = name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const id = req.body?.id || `${slug || 'subj'}-${Date.now().toString(36).slice(-4)}`;
        subjects.push({ id, name, teacher });
      }
      const nextJournal = writeJournalState({ ...journal, subjects });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error creating subject:', err);
      return res.status(500).json({ error: 'Nie udało się utworzyć przedmiotu' });
    }
  });

  app.post('/api/subjects/delete', (req, res) => {
    try {
      const subjectId = String(req.body?.subjectId ?? '').trim();
      if (!subjectId) {
        return res.status(400).json({ error: 'Brak identyfikatora przedmiotu' });
      }
      const journal = readJournal();
      const nextSubjects = (journal.subjects ?? []).filter((s: any) => s.id !== subjectId);
      const nextJournal = writeJournalState({ ...journal, subjects: nextSubjects });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error deleting subject:', err);
      return res.status(500).json({ error: 'Nie udało się usunąć przedmiotu' });
    }
  });

  app.post('/api/categories/create', (req, res) => {
    try {
      const name = String(req.body?.name ?? '').trim();
      const defaultWeight = Math.min(5, Math.max(0, Number(req.body?.defaultWeight ?? 2)));
      const countsToAverage = req.body?.countsToAverage !== false;
      if (!name) {
        return res.status(400).json({ error: 'Nazwa kategorii jest wymagana' });
      }
      const journal = readJournal();
      const gradeCategories = Array.isArray(journal.gradeCategories)
        ? [...journal.gradeCategories]
        : [...DEFAULT_GRADE_CATEGORIES];
      const duplicate = gradeCategories.some(
        (c: any) => String(c.name).trim().toLowerCase() === name.toLowerCase()
      );
      if (!duplicate) {
        const id = req.body?.id || `cat-${Date.now().toString(36)}`;
        gradeCategories.push({ id, name, defaultWeight, countsToAverage });
      }
      const nextJournal = writeJournalState({ ...journal, gradeCategories });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error creating grade category:', err);
      return res.status(500).json({ error: 'Nie udało się utworzyć kategorii ocen' });
    }
  });

  app.post('/api/categories/delete', (req, res) => {
    try {
      const categoryId = String(req.body?.categoryId ?? '').trim();
      if (!categoryId) {
        return res.status(400).json({ error: 'Brak identyfikatora kategorii' });
      }
      const journal = readJournal();
      const nextCategories = (journal.gradeCategories ?? DEFAULT_GRADE_CATEGORIES).filter(
        (c: any) => c.id !== categoryId
      );
      const nextJournal = writeJournalState({ ...journal, gradeCategories: nextCategories });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error deleting grade category:', err);
      return res.status(500).json({ error: 'Nie udało się usunąć kategorii ocen' });
    }
  });

  app.post('/api/classes/hours', (req, res) => {
    try {
      const rawClassId = String(req.body?.classId ?? '').trim();
      const hours = req.body?.hours;
      if (!rawClassId || !hours || typeof hours !== 'object') {
        return res.status(400).json({ error: 'Nieprawidłowe dane godzin lekcyjnych' });
      }
      const journal = readJournal();
      const matchedCls = (journal.classes ?? []).find(
        (c: any) =>
          String(c.id).trim().toUpperCase() === rawClassId.toUpperCase() ||
          String(c.name).trim().toUpperCase() === rawClassId.toUpperCase()
      );
      const canonicalClassId = matchedCls?.id ?? rawClassId.toUpperCase();

      const cleanedHours: Record<number, { start: string; end: string }> = {};
      for (const [k, v] of Object.entries(hours)) {
        const num = Number(k);
        if (
          num >= 1 &&
          num <= 12 &&
          v &&
          typeof v === 'object' &&
          'start' in v &&
          'end' in v
        ) {
          const start = String((v as any).start ?? '').trim();
          const end = String((v as any).end ?? '').trim();
          if (start && end) {
            cleanedHours[num] = { start, end };
          }
        }
      }
      const nextClassLessonHours = {
        ...(journal.classLessonHours ?? {}),
        [canonicalClassId]: cleanedHours,
      };
      const nextJournal = writeJournalState({ ...journal, classLessonHours: nextClassLessonHours });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error saving class lesson hours:', err);
      return res.status(500).json({ error: 'Nie udało się zapisać godzin lekcyjnych' });
    }
  });

  app.post('/api/timetable/cancel-day', (req, res) => {
    try {
      const rawClassId = String(req.body?.classId ?? 'ALL').trim() || 'ALL';
      const dayIndex = Number(req.body?.dayIndex);
      const reason = String(req.body?.reason ?? '').trim();
      const cancelledBy = String(req.body?.cancelledBy ?? 'Dyrekcja').trim() || 'Dyrekcja';

      if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 4) {
        return res.status(400).json({ error: 'Nieprawidłowy dzień tygodnia' });
      }
      if (!reason) {
        return res.status(400).json({ error: 'Podaj powód odwołania całego dnia' });
      }

      const journal = readJournal();
      const classId =
        rawClassId.toUpperCase() === 'ALL'
          ? 'ALL'
          : (journal.classes ?? []).find(
              (c: any) =>
                String(c.id).toUpperCase() === rawClassId.toUpperCase() ||
                String(c.name).toUpperCase() === rawClassId.toUpperCase()
            )?.id ?? rawClassId.toUpperCase();

      const existingDays = Array.isArray(journal.cancelledDays) ? [...journal.cancelledDays] : [];
      const filteredDays = existingDays.filter(
        (d: any) => !(d.dayIndex === dayIndex && d.classId === classId)
      );
      filteredDays.push({
        id: `cday-${classId}-${dayIndex}-${Date.now().toString(36)}`,
        classId,
        dayIndex,
        reason,
        cancelledBy,
        createdAt: formatPolishDateTime(new Date()),
      });

      const nextTimetable = (journal.timetable ?? []).map((slot: any) => {
        const slotClass = slot.classId ?? '3B';
        const matchesClass = classId === 'ALL' || slotClass === classId;
        if (slot.dayIndex === dayIndex && matchesClass) {
          return {
            ...slot,
            changeType: 'cancelled',
            changeNote: reason,
          };
        }
        return slot;
      });

      const nextJournal = writeJournalState({
        ...journal,
        cancelledDays: filteredDays,
        timetable: nextTimetable,
      });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error cancelling whole day:', err);
      return res.status(500).json({ error: 'Nie udało się odwołać całego dnia' });
    }
  });

  app.post('/api/timetable/restore-day', (req, res) => {
    try {
      const id = req.body?.id ? String(req.body.id).trim() : '';
      const rawClassId = req.body?.classId ? String(req.body.classId).trim() : '';
      const rawDayIdx = req.body?.dayIndex !== undefined ? Number(req.body.dayIndex) : undefined;

      const journal = readJournal();
      const currentDays = Array.isArray(journal.cancelledDays) ? [...journal.cancelledDays] : [];
      const targetEntry = id
        ? currentDays.find((d: any) => d.id === id)
        : currentDays.find((d: any) => d.classId === rawClassId && d.dayIndex === rawDayIdx);

      const targetClassId = targetEntry?.classId ?? rawClassId;
      const targetDayIndex = targetEntry?.dayIndex ?? rawDayIdx;

      const nextCancelledDays = currentDays.filter((d: any) => {
        if (id && d.id === id) return false;
        if (
          targetClassId &&
          targetDayIndex !== undefined &&
          d.classId === targetClassId &&
          d.dayIndex === targetDayIndex
        ) {
          return false;
        }
        return true;
      });

      const nextTimetable = (journal.timetable ?? []).map((slot: any) => {
        if (targetDayIndex === undefined || slot.dayIndex !== targetDayIndex) return slot;
        const slotClass = slot.classId ?? '3B';
        const matchesClass = targetClassId === 'ALL' || slotClass === targetClassId;
        if (matchesClass && slot.changeType === 'cancelled') {
          return {
            ...slot,
            changeType: 'normal',
            changeNote: undefined,
          };
        }
        return slot;
      });

      const nextJournal = writeJournalState({
        ...journal,
        cancelledDays: nextCancelledDays,
        timetable: nextTimetable,
      });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error restoring cancelled day:', err);
      return res.status(500).json({ error: 'Nie udało się przywrócić dnia' });
    }
  });

  app.post('/api/classes/students/temp-move', (req, res) => {
    try {
      const fromClassId = String(req.body?.fromClassId ?? '').trim();
      const toClassId = String(req.body?.toClassId ?? '').trim();
      const studentId = String(req.body?.studentId ?? '').trim();
      const date = String(req.body?.date ?? '').trim();
      const reason = String(req.body?.reason ?? '').trim();
      const createdBy = String(req.body?.createdBy ?? 'Nauczyciel').trim() || 'Nauczyciel';

      if (!fromClassId || !toClassId || !studentId || !date) {
        return res
          .status(400)
          .json({ error: 'Wybierz klasę źródłową, docelową, ucznia oraz datę' });
      }
      if (fromClassId === toClassId) {
        return res.status(400).json({ error: 'Klasa źródłowa i docelowa muszą być różne' });
      }

      const journal = readJournal();
      const fromCls = (journal.classes ?? []).find((c: any) => c.id === fromClassId);
      const toCls = (journal.classes ?? []).find((c: any) => c.id === toClassId);
      const student = fromCls?.students?.find((s: any) => s.id === studentId);
      if (!fromCls || !toCls || !student) {
        return res.status(404).json({ error: 'Nie znaleziono wskazanej klasy lub ucznia' });
      }

      const currentTransfers = Array.isArray(journal.temporaryTransfers)
        ? [...journal.temporaryTransfers]
        : [];
      const filtered = currentTransfers.filter(
        (t: any) => !(t.studentId === studentId && t.date === date)
      );
      const record = {
        id: `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        studentId,
        studentName: student.fullName,
        fromClassId: fromCls.id,
        toClassId: toCls.id,
        date,
        reason: reason || undefined,
        createdBy,
        createdAt: formatPolishDateTime(new Date()),
      };
      filtered.push(record);

      const nextJournal = writeJournalState({ ...journal, temporaryTransfers: filtered });
      return res.json({ success: true, journal: nextJournal, transfer: record });
    } catch (err) {
      console.error('Error saving temporary student transfer:', err);
      return res.status(500).json({ error: 'Nie udało się zapisać przeniesienia na jeden dzień' });
    }
  });

  app.post('/api/classes/students/temp-delete', (req, res) => {
    try {
      const id = String(req.body?.id ?? '').trim();
      if (!id) {
        return res.status(400).json({ error: 'Brak identyfikatora przeniesienia' });
      }
      const journal = readJournal();
      const nextTransfers = (journal.temporaryTransfers ?? []).filter((t: any) => t.id !== id);
      const nextJournal = writeJournalState({ ...journal, temporaryTransfers: nextTransfers });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error deleting temporary student transfer:', err);
      return res.status(500).json({ error: 'Nie udało się usunąć przeniesienia na jeden dzień' });
    }
  });

  app.post('/api/topics/ready/create', (req, res) => {
    try {
      const subjectId = String(req.body?.subjectId ?? '').trim();
      const title = String(req.body?.title ?? '').trim();
      const hours = Math.min(10, Math.max(1, Number(req.body?.hours ?? 1) || 1));
      const color = String(req.body?.color ?? '#7B2276').trim() || '#7B2276';
      if (!subjectId || !title) {
        return res.status(400).json({ error: 'Przedmiot i tytuł tematu są wymagane' });
      }
      const journal = readJournal();
      const readyTopics = Array.isArray(journal.readyTopics) ? [...journal.readyTopics] : [];
      const existingIdx = readyTopics.findIndex(
        (t: any) =>
          t.subjectId === subjectId &&
          String(t.title).trim().toLowerCase() === title.toLowerCase()
      );
      if (existingIdx >= 0) {
        readyTopics[existingIdx] = {
          ...readyTopics[existingIdx],
          title,
          hours,
          color,
        };
      } else {
        const id = req.body?.id || `rt-${Date.now().toString(36)}`;
        readyTopics.push({ id, subjectId, title, hours, color });
      }
      const nextJournal = writeJournalState({ ...journal, readyTopics });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error creating ready topic:', err);
      return res.status(500).json({ error: 'Nie udało się utworzyć gotowego tematu' });
    }
  });

  app.post('/api/topics/ready/delete', (req, res) => {
    try {
      const topicId = String(req.body?.topicId ?? '').trim();
      if (!topicId) {
        return res.status(400).json({ error: 'Brak identyfikatora gotowego tematu' });
      }
      const journal = readJournal();
      const nextReady = (journal.readyTopics ?? []).filter((t: any) => t.id !== topicId);
      const nextJournal = writeJournalState({ ...journal, readyTopics: nextReady });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error deleting ready topic:', err);
      return res.status(500).json({ error: 'Nie udało się usunąć gotowego tematu' });
    }
  });

  app.post('/api/rooms/create', (req, res) => {
    try {
      const roomName = String(req.body?.name ?? '').trim();
      if (!roomName) {
        return res.status(400).json({ error: 'Nazwa klasy-sali jest wymagana' });
      }
      const journal = readJournal();
      const existing = Array.isArray(journal.classRooms) ? [...journal.classRooms] : [];
      if (!existing.some((r: string) => r.toLowerCase() === roomName.toLowerCase())) {
        existing.push(roomName);
      }
      const nextJournal = writeJournalState({ ...journal, classRooms: existing });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error creating class room:', err);
      return res.status(500).json({ error: 'Nie udało się utworzyć klasy-sali' });
    }
  });

  app.post('/api/rooms/delete', (req, res) => {
    try {
      const roomName = String(req.body?.name ?? '').trim();
      if (!roomName) {
        return res.status(400).json({ error: 'Brak nazwy klasy-sali' });
      }
      const journal = readJournal();
      const nextRooms = (journal.classRooms ?? []).filter(
        (r: string) => r.toLowerCase() !== roomName.toLowerCase()
      );
      const nextJournal = writeJournalState({ ...journal, classRooms: nextRooms });
      return res.json({ success: true, journal: nextJournal });
    } catch (err) {
      console.error('Error deleting class room:', err);
      return res.status(500).json({ error: 'Nie udało się usunąć klasy-sali' });
    }
  });

  app.post('/api/reset', (req, res) => {
    try {
      const resetToken = Date.now();
      const accountsMeta = writeAccountsState(DEMO_ACCOUNTS, {
        revision: 0,
        updatedAt: resetToken,
        resetToken,
      });
      const journal = writeJournalState(INITIAL_JOURNAL_DATA, {
        revision: 0,
        updatedAt: resetToken,
        resetToken,
      });
      return res.json({ success: true, accounts: DEMO_ACCOUNTS, accountsMeta, journal });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reset data' });
    }
  });

  // In development, hook Vite into express middlewares
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`E-Dziennik server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
