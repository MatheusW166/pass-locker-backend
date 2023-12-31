import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '@app/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SignInDto, SignUpDto } from './dto';
import { BcryptService } from '@app/cryptr/bcrypt.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly bcryptService: BcryptService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password } = signUpDto;
    const userFound = await this.usersService.findByEmail(email);

    if (userFound) throw new ConflictException();

    const hashedPass = this.bcryptService.hash(password);
    const user = await this.usersService.create({
      ...signUpDto,
      password: hashedPass,
    });

    delete user.password;
    return user;
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException();
    }

    this.comparePasswordsOrThrow(password, user.password);

    const payload = { userId: user.id };
    const token = await this.jwtService.signAsync(payload);
    return { token };
  }

  comparePasswordsOrThrow(password: string, encryptedPassword: string) {
    if (!this.bcryptService.compare(password, encryptedPassword)) {
      throw new UnauthorizedException();
    }
    return true;
  }

  async verifyJwt(token: string) {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (_) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
