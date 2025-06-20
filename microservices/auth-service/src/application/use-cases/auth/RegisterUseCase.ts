import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IRoleRepository } from '../../../domain/repositories/IRoleRepository';
import { IEmailService } from '../../services/IEmailService';

export interface RegisterUseCaseRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterUseCaseResponse {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  message: string;
}

export class RegisterUseCase {
  constructor(
    private userRepository: IUserRepository,
    private roleRepository: IRoleRepository,
    private emailService: IEmailService
  ) {}

  async execute(request: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
    const { email, username, password, firstName, lastName } = request;

    // Check if email already exists
    const emailExists = await this.userRepository.existsByEmail(email);
    if (emailExists) {
      throw new Error('Email already registered');
    }

    // Check if username already exists
    const usernameExists = await this.userRepository.existsByUsername(username);
    if (usernameExists) {
      throw new Error('Username already taken');
    }

    // Validate password strength
    this.validatePassword(password);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token
    const emailVerificationToken = uuidv4();

    // Create user
    const user = new User({
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      isActive: true,
      isEmailVerified: false,
      emailVerificationToken,
      twoFactorEnabled: false,
      failedLoginAttempts: 0
    });

    // Save user
    const savedUser = await this.userRepository.create(user);

    // Assign default role (user)
    const userRole = await this.roleRepository.findByName('user');
    if (userRole) {
      await this.roleRepository.assignToUser(savedUser.id, userRole.id);
    }

    // Send verification email
    await this.emailService.sendVerificationEmail(
      email,
      firstName,
      emailVerificationToken
    );

    return {
      id: savedUser.id,
      email: savedUser.email,
      username: savedUser.username,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      message: 'Registration successful. Please check your email to verify your account.'
    };
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }
}