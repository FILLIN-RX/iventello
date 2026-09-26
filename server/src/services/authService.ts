import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { userRepository, UserRepository } from '../repositories/userRepository';
import { config } from '../config';

export class AuthService {
  private userRepo: UserRepository;

  constructor(userRepo: UserRepository = userRepository) {
    this.userRepo = userRepo;
  }

  /**
   * Création du compte Super-Administrateur initial
   */
  public async registerSuperAdmin(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    pin?: string;
  }): Promise<{ user: Omit<User, 'passwordHash' | 'pinCodeHash'>; token: string }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(cleanEmail);
    if (existing) {
      throw new Error('Un compte avec cette adresse email existe déjà.');
    }

    if (data.password.length < 6) {
      throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const pinCodeHash = data.pin ? await bcrypt.hash(data.pin, 10) : undefined;

    const newUser: User = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      passwordHash,
      pinCodeHash,
      globalRole: 'SUPER_ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.userRepo.create(newUser);

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.globalRole },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    const { passwordHash: _, pinCodeHash: __, ...sanitizedUser } = newUser;
    return { user: sanitizedUser, token };
  }

  /**
   * Authentification standard par email & mot de passe
   */
  public async login(
    email: string,
    password: string
  ): Promise<{ user: Omit<User, 'passwordHash' | 'pinCodeHash'>; token: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(cleanEmail);

    if (!user) {
      throw new Error('Adresse email introuvable.');
    }

    if (!user.isActive) {
      throw new Error('Ce compte utilisateur a été désactivé.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Mot de passe incorrect.');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.globalRole },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    const { passwordHash: _, pinCodeHash: __, ...sanitizedUser } = user;
    return { user: sanitizedUser, token };
  }

  /**
   * Réinitialisation de mot de passe suite à validation de code OTP
   */
  public async resetPassword(email: string, newPassword: string): Promise<void> {
    if (newPassword.length < 6) {
      throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const success = await this.userRepo.updatePassword(email, passwordHash);
    if (!success) {
      throw new Error('Impossible de mettre à jour le mot de passe pour cet utilisateur.');
    }
  }

  /**
   * Vérification d'un Token JWT
   */
  public verifyToken(token: string): any {
    return jwt.verify(token, config.jwtSecret);
  }
}

export const authService = new AuthService();
