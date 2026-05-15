import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 201, description: 'Login successful, returns JWT token' })
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, input);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() input: ChangePasswordDto) {
    return this.auth.changePassword(user.id, input);
  }
}
