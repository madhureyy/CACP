import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'cacp-super-secret-jwt-key-2026';
const JWT_EXPIRES_IN = '7d';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  provider: string;
  avatar?: string;
}

export class AuthService {
  public static generateToken(user: UserPayload): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        avatar: user.avatar,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  public static verifyToken(token: string): UserPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as UserPayload;
    } catch {
      return null;
    }
  }

  public static async login(email: string, pass: string): Promise<{ user: UserPayload; token: string } | null> {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM users WHERE email = ?').all(email.toLowerCase().trim()) as any[];

    if (rows.length === 0) return null;
    const user = rows[0];

    const isValid = await bcrypt.compare(pass, user.password_hash);
    if (!isValid) return null;

    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      avatar: user.avatar,
    };

    return {
      user: payload,
      token: this.generateToken(payload),
    };
  }

  public static async register(email: string, pass: string, name: string): Promise<{ user: UserPayload; token: string }> {
    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').all(cleanEmail);
    if (existing.length > 0) {
      throw new Error('A user with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pass, salt);
    const id = `user_${Date.now()}`;
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, provider, avatar, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanEmail, passwordHash, name, 'local', avatar, new Date().toISOString());

    const payload: UserPayload = {
      id,
      email: cleanEmail,
      name,
      provider: 'local',
      avatar,
    };

    return {
      user: payload,
      token: this.generateToken(payload),
    };
  }

  public static async googleOAuthLogin(googleUser: { email: string; name: string; avatar?: string }): Promise<{ user: UserPayload; token: string }> {
    const db = getDb();
    const cleanEmail = googleUser.email.toLowerCase().trim();

    const rows = db.prepare('SELECT * FROM users WHERE email = ?').all(cleanEmail) as any[];

    let payload: UserPayload;
    if (rows.length > 0) {
      const user = rows[0];
      payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: 'google',
        avatar: user.avatar || googleUser.avatar,
      };
    } else {
      const id = `user_google_${Date.now()}`;
      const avatar = googleUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleUser.name)}`;
      const dummyHash = await bcrypt.hash(`oauth_${Math.random()}`, 10);

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, provider, avatar, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, cleanEmail, dummyHash, googleUser.name, 'google', avatar, new Date().toISOString());

      payload = {
        id,
        email: cleanEmail,
        name: googleUser.name,
        provider: 'google',
        avatar,
      };
    }

    return {
      user: payload,
      token: this.generateToken(payload),
    };
  }
}
