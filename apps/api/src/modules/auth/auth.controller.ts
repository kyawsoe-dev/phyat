import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthService } from './auth.service';
import { ChangePasswordDto, GoogleLoginDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto';
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

  @Post('google')
  @ApiOperation({ summary: 'Login or register with Google' })
  @ApiResponse({ status: 201, description: 'Google login successful, returns JWT token' })
  google(@Body() input: GoogleLoginDto) {
    return this.auth.googleLogin(input);
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

  @UseGuards(JwtAuthGuard)
  @Get('2fa/setup')
  @ApiOperation({ summary: 'Get 2FA setup data' })
  get2faSetup(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.generateUser2faSecret(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify-setup')
  @ApiOperation({ summary: 'Verify 2FA setup token' })
  verify2faSetup(@CurrentUser() user: AuthenticatedUser, @Body('token') token: string) {
    return this.auth.verifyUser2faSetup(user.id, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  disable2fa(@CurrentUser() user: AuthenticatedUser, @Body('password') password: string) {
    return this.auth.disableUser2fa(user.id, password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('2fa/status')
  @ApiOperation({ summary: 'Get 2FA status' })
  get2faStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getUser2faStatus(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify-login')
  @ApiOperation({ summary: 'Verify 2FA code during login' })
  verifyLogin2fa(@CurrentUser() user: AuthenticatedUser, @Body('totp') totp: string) {
    return this.auth.verifyLogin2fa(user.id, totp);
  }
}
