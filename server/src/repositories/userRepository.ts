import { User } from '../models';

export class UserRepository {
  private users: Map<string, User> = new Map();

  constructor() {
    // Initialisation d'un compte SuperAdmin local par défaut pour démarrage immédiat
    const defaultAdmin: User = {
      id: 'admin-super-001',
      email: 'admin@iventello.com',
      passwordHash: '$2a$10$WpP9zM6C1z7zY3wE8J8Zke9U2lQy5mI3VzM2G3Y6vN3c3L4l0G9b.', // admin1234
      firstName: 'Ruxel',
      lastName: 'SuperAdmin',
      globalRole: 'SUPER_ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(defaultAdmin.email, defaultAdmin);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    return this.users.get(cleanEmail) || null;
  }

  public async findById(id: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.id === id) return user;
    }
    return null;
  }

  public async create(user: User): Promise<User> {
    this.users.set(user.email.toLowerCase(), user);
    return user;
  }

  public async updatePassword(email: string, passwordHash: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) return false;
    user.passwordHash = passwordHash;
    user.updatedAt = new Date();
    user.mustChangePassword = false;
    this.users.set(email.toLowerCase(), user);
    return true;
  }

  public async updatePin(userId: string, pinCodeHash: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;
    user.pinCodeHash = pinCodeHash;
    user.updatedAt = new Date();
    this.users.set(user.email.toLowerCase(), user);
    return true;
  }

  public async count(): Promise<number> {
    return this.users.size;
  }

  public async getAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

export const userRepository = new UserRepository();
